import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Gmail SMTP transport
// ---------------------------------------------------------------------------
// Emails are sent through Gmail's SMTP servers using a Gmail account + App
// Password (NOT the account's normal login password). This avoids the
// SpamCop-listed shared-IP blocks that SendGrid's shared pool was hitting.
//
// Required environment variables:
//   SMTP_USER  — the Gmail address to send from (e.g. kenyt.notifications@gmail.com)
//   SMTP_PASS  — a 16-character Gmail App Password
//                (Google Account -> Security -> 2-Step Verification -> App passwords)
// Optional:
//   SMTP_HOST  — defaults to smtp.gmail.com (use smtp-relay.gmail.com for
//                Google Workspace SMTP relay)
//   SMTP_PORT  — defaults to 465 (implicit TLS)
//   EMAIL_FROM — display/from address; MUST be SMTP_USER itself or an alias
//                verified in that Gmail account, otherwise Gmail rewrites it.
// ---------------------------------------------------------------------------

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn(
    "[email] SMTP_USER / SMTP_PASS not set — email notifications are DISABLED. " +
      "Set both (Gmail address + App Password) to enable them."
  );
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

// Gmail will only send from the authenticated account (or one of its verified
// aliases) — anything else gets rewritten to the authenticated user anyway.
const FROM_EMAIL = (process.env.EMAIL_FROM || process.env.SMTP_USER || "").trim();

// Recipients that receive a notification whenever a new order is created
// (typically the super user / operators who perform truck allocation).
// May be a single address or a comma-separated list.
const SUPER_USER_EMAILS = parseEmails(process.env.SUPER_USER_EMAIL);

if (process.env.SUPER_USER_EMAIL &&
    (process.env.SUPER_USER_EMAIL || "").split(",").length !== SUPER_USER_EMAILS.length) {
  console.warn("[email] Dropped one or more invalid address(es) from SUPER_USER_EMAIL.");
}

// Additional recipients notified once a truck has been allocated. Comma-separated.
const RAW_TEAM_NOTIFICATION_EMAILS = (process.env.TEAM_NOTIFICATION_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const TEAM_NOTIFICATION_EMAILS = RAW_TEAM_NOTIFICATION_EMAILS.filter(isValidEmail);

if (RAW_TEAM_NOTIFICATION_EMAILS.length !== TEAM_NOTIFICATION_EMAILS.length) {
  console.warn(
    `[email] Dropped ${RAW_TEAM_NOTIFICATION_EMAILS.length - TEAM_NOTIFICATION_EMAILS.length} invalid ` +
      "address(es) from TEAM_NOTIFICATION_EMAILS. Fix them or those recipients will not get allocation emails."
  );
}

/** Simple email-shape check — catches empty / whitespace-padded / typo'd values. */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Split a comma-separated env list into trimmed, valid email addresses. */
function parseEmails(raw: string | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .filter(isValidEmail);
}

/** Send a single email; one bad/bouncing recipient cannot block the others. */
async function sendToOne(recipient: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: recipient,
      subject,
      html,
    });
    console.log(`[email] Notification sent to: ${recipient}`);
  } catch (err) {
    console.error(`[email] Failed to send to ${recipient}:`, err);
  }
}

// Log the resolved email configuration at startup so that in Railway logs you
// can immediately see which environment variables still need to be set.
console.info(
  "[email] Config -> super user: " +
    (SUPER_USER_EMAILS.length
      ? SUPER_USER_EMAILS.join(", ")
      : "<NOT SET>") +
    " | from: " +
    FROM_EMAIL +
    " | team: " +
    (TEAM_NOTIFICATION_EMAILS.length
      ? TEAM_NOTIFICATION_EMAILS.join(", ")
      : "<NOT SET>") +
    " | smtp user: " +
    (process.env.SMTP_USER || "<NOT SET>") +
    " | smtp pass: " +
    (process.env.SMTP_PASS ? "set" : "<NOT SET>")
);

interface OrderNotificationData {
  orderId: number;
  bolNumber: string;
  customerName: string;
  cargoType: string;
  weightTonnes: string;
  loadType: string;
  pickup: string;
  delivery: string;
  etaDischarge?: string | null;
  specialInstructions?: string | null;
}

interface AllocationNotificationData {
  orderId: number;
  bolNumber: string;
  customerName: string;
  truckRegistration: string;
  truckCapacity?: string | null;
}

/**
 * Send an email notification when a new order is created.
 * Notifies the super user so they can perform the allocation.
 */
export async function sendOrderCreatedNotification(
  data: OrderNotificationData
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP_USER / SMTP_PASS not set — skipping order notification.");
    return;
  }

  if (SUPER_USER_EMAILS.length === 0) {
    console.warn(
      "[email] SUPER_USER_EMAIL is missing or invalid — skipping order notification. " +
        "Set a valid SUPER_USER_EMAIL (comma-separated if multiple) in the backend service variables and redeploy."
    );
    return;
  }

  const subject = `New Order ${data.bolNumber} — Awaiting Allocation`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #1e3a5f; color: #fff; padding: 16px 24px;">
        <h2 style="margin: 0; font-size: 18px;">New Order Requires Allocation</h2>
      </div>
      <div style="padding: 24px;">
        <p style="margin: 0 0 16px; color: #374151;">A new order has been created and is awaiting truck allocation. Please review and allocate a truck.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 40%;">Order ID</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">#${data.orderId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">BOL Number</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827; font-family: monospace;">${data.bolNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Customer</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Cargo</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.cargoType} (${data.weightTonnes} tonnes)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Load Type</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.loadType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Pickup</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.pickup}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Delivery</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.delivery}</td>
          </tr>
          ${data.etaDischarge ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">ETA Discharge</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.etaDischarge}</td>
          </tr>` : ""}
          ${data.specialInstructions ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Instructions</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.specialInstructions}</td>
          </tr>` : ""}
        </table>
        <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px;">Please log into the platform to allocate a suitable truck.</p>
      </div>
    </div>
  `;

  for (const recipient of SUPER_USER_EMAILS) {
    await sendToOne(recipient, subject, html);
  }
}

/**
 * Send an email notification when an allocation has been completed.
 * Notifies the team/users so they can inform drivers and relevant parties.
 */
export async function sendAllocationNotification(
  data: AllocationNotificationData
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP_USER / SMTP_PASS not set — skipping allocation notification.");
    return;
  }

  if (TEAM_NOTIFICATION_EMAILS.length === 0) {
    console.warn("[email] TEAM_NOTIFICATION_EMAILS not set — skipping allocation notification.");
    return;
  }

  const subject = `Truck Allocated for Order ${data.bolNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #15803d; color: #fff; padding: 16px 24px;">
        <h2 style="margin: 0; font-size: 18px;">Truck Allocated</h2>
      </div>
      <div style="padding: 24px;">
        <p style="margin: 0 0 16px; color: #374151;">A truck has been allocated to the order below. Please inform the driver and relevant parties.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 40%;">Order ID</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">#${data.orderId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">BOL Number</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827; font-family: monospace;">${data.bolNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Customer</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Allocated Truck</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827; font-family: monospace;">${data.truckRegistration}</td>
          </tr>
          ${data.truckCapacity ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Truck Capacity</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.truckCapacity} tonnes</td>
          </tr>` : ""}
        </table>
        <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px;">Please inform the assigned driver and any other relevant parties about this allocation.</p>
      </div>
    </div>
  `;

  // Send one email per recipient so that a single invalid/bouncing address
  // cannot block notifications from reaching the others.
  for (const recipient of TEAM_NOTIFICATION_EMAILS) {
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: recipient,
        subject,
        html,
      });
      console.log(`[email] Allocation notification sent to: ${recipient}`);
    } catch (err) {
      console.error(
        `[email] Failed to send allocation notification to ${recipient}:`,
        err
      );
    }
  }
}
