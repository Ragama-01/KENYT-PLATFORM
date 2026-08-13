import sgMail from "@sendgrid/mail";

// Configure SendGrid with the API key from environment variables
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@kenytinternational.com";
const SUPER_USER_EMAIL = process.env.SUPER_USER_EMAIL || "";
const TEAM_NOTIFICATION_EMAILS = (process.env.TEAM_NOTIFICATION_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

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
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("[email] SENDGRID_API_KEY not set — skipping order notification.");
    return;
  }

  if (!SUPER_USER_EMAIL) {
    console.warn("[email] SUPER_USER_EMAIL not set — skipping order notification.");
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

  try {
    await sgMail.send({
      to: SUPER_USER_EMAIL,
      from: FROM_EMAIL,
      subject,
      html,
    });
    console.log(`[email] Order notification sent to ${SUPER_USER_EMAIL}`);
  } catch (err) {
    console.error("[email] Failed to send order notification:", err);
  }
}

/**
 * Send an email notification when an allocation has been completed.
 * Notifies the team/users so they can inform drivers and relevant parties.
 */
export async function sendAllocationNotification(
  data: AllocationNotificationData
): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("[email] SENDGRID_API_KEY not set — skipping allocation notification.");
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

  try {
    await sgMail.send({
      to: TEAM_NOTIFICATION_EMAILS,
      from: FROM_EMAIL,
      subject,
      html,
    });
    console.log(`[email] Allocation notification sent to: ${TEAM_NOTIFICATION_EMAILS.join(", ")}`);
  } catch (err) {
    console.error("[email] Failed to send allocation notification:", err);
  }
}