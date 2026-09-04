import "dotenv/config";
import nodemailer from "nodemailer";

// Diagnostic tool to find out exactly why email notifications are not arriving.
//
// It sends a real test email to the configured SUPER_USER_EMAIL via Gmail SMTP
// and, if Gmail rejects it, prints the precise reason.
//
//   cd Kenyt_api
//   npm run email:test
//
// The most common causes surfaced here are:
//   1. SMTP_USER / SMTP_PASS missing (a Gmail address + App Password is required).
//   2. Wrong password — it must be a 16-character App Password created under
//      Google Account -> Security -> 2-Step Verification -> App passwords,
//      NOT the Gmail login password.
//   3. EMAIL_FROM set to something other than SMTP_USER or one of its
//      verified aliases (Gmail rewrites/repudiates other From addresses).

function getErrorDetail(err: unknown): string {
  const e = err as { message?: string; code?: string; response?: string; command?: string };
  const lines: string[] = [];
  if (e.message) lines.push(`message: ${e.message}`);
  if (e.code) lines.push(`code: ${e.code}`);
  if (e.command) lines.push(`command: ${e.command}`);
  if (e.response) lines.push(`response: ${e.response}`);
  return lines.length ? lines.join("\n") : String(err);
}

async function main(): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ SMTP_USER / SMTP_PASS is not set. Set both (Gmail address + App Password) and retry.");
    process.exit(1);
  }

  const from = (process.env.EMAIL_FROM || process.env.SMTP_USER).trim();
  const toList = (process.env.SUPER_USER_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log("[email:test] Resolved config:");
  console.log(`  SMTP_HOST        : ${process.env.SMTP_HOST || "smtp.gmail.com"}`);
  console.log(`  SMTP_USER        : ${process.env.SMTP_USER}`);
  console.log(`  SMTP_PASS        : set (len ${process.env.SMTP_PASS!.length})`);
  console.log(`  EMAIL_FROM       : ${from || "<EMPTY>"}`);
  console.log(`  SUPER_USER_EMAIL : ${toList.join(", ") || "<EMPTY>"}`);
  console.log(`  TEAM             : ${(process.env.TEAM_NOTIFICATION_EMAILS || "").trim() || "<EMPTY>"}`);

  if (toList.length === 0) {
    console.error("❌ SUPER_USER_EMAIL is not set. Nothing to send to.");
    process.exit(1);
  }
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from) ||
    toList.some((t) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t))
  ) {
    console.error("❌ EMAIL_FROM or SUPER_USER_EMAIL is not a valid-looking email address.");
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP login succeeded.");
  } catch (err) {
    console.error("\n❌ SMTP login failed. Exact reason:\n" + getErrorDetail(err));
    console.error("\nFix hints:");
    console.error("  1. SMTP_PASS must be a Gmail App Password (16 chars), not the account password.");
    console.error("     Create one at Google Account -> Security -> 2-Step Verification -> App passwords.");
    console.error("  2. 2-Step Verification must be enabled on the Gmail account to create App Passwords.");
    process.exit(1);
  }

  // Sending to ALL configured super-user recipients (handles comma-separated lists).
  let anyRejected = false;
  for (const to of toList) {
    console.log(`\nSending a test email from ${from} to ${to} ...`);
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: "KENYT platform — email test",
        html: "<p>This is a test email from the KENYT platform. If you are reading this, Gmail SMTP notifications are working.</p>",
      });
      console.log(`✅ Gmail accepted the send to ${to} (id: ${info.messageId}). Check that inbox (and spam).`);
    } catch (err) {
      anyRejected = true;
      console.error(`\n❌ Gmail rejected the send to ${to}. Exact reason:\n` + getErrorDetail(err));
    }
  }

  if (anyRejected) {
    console.error("\nFix hints:");
    console.error("  1. EMAIL_FROM must be the SMTP_USER address itself or a verified alias of it.");
    console.error("  2. Check recipient addresses for typos (e.g. kenytintinternational.com vs kenytinternational.com).");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});