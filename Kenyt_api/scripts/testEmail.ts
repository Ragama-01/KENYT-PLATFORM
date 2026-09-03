import "dotenv/config";
import sgMail from "@sendgrid/mail";

// Diagnostic tool to find out exactly why email notifications are not arriving.
//
// It sends a real test email to the configured SUPER_USER_EMAIL and, if SendGrid
// rejects it, prints the precise reason (SendGrid returns a structured body with
// `errors` — e.g. "The from address does not match a verified Sender Identity."
// for the very common unverified FROM/sender problem).
//
//   cd Kenyt_api
//   npm run email:test
//
// The most common causes surfaced here are:
//   1. SENDGRID_API_KEY missing/invalid or lacking Mail-Send permission.
//   2. EMAIL_FROM domain/address NOT verified under SendGrid -> Sender
//      Authentication (sends get rejected with HTTP 403).

function getErrorDetail(err: unknown): string {
  // @sendgrid/mail wraps failures in an error with a `response` object whose
  // body carries the actual SendGrid API error details.
  const e = err as {
    message?: string;
    response?: { statusCode?: number; body?: unknown };
  };
  const lines: string[] = [];
  if (e.message) lines.push(`message: ${e.message}`);
  if (e.response) {
    if (e.response.statusCode) lines.push(`status: ${e.response.statusCode}`);
    if (e.response.body) {
      lines.push(`body: ${JSON.stringify(e.response.body, null, 2)}`);
    }
  }
  return lines.length ? lines.join("\n") : String(err);
}

async function main(): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ SENDGRID_API_KEY is not set. Set it and retry.");
    process.exit(1);
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const from = (process.env.EMAIL_FROM || "noreply@kenytinternational.com").trim();
  const toList = (process.env.SUPER_USER_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log("[email:test] Resolved config:");
  console.log(`  SENDGRID_API_KEY : ${process.env.SENDGRID_API_KEY ? "set (len " + process.env.SENDGRID_API_KEY.length + ")" : "NOT SET"}`);
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

  // Sending to ALL configured super-user recipients (handles comma-separated lists).
  let anyRejected = false;
  for (const to of toList) {
    console.log(`\nSending a test email from ${from} to ${to} ...`);
    try {
      await sgMail.send({
        to,
        from,
        subject: "KENYT platform — email test",
        html: "<p>This is a test email from the KENYT platform. If you are reading this, SendGrid notifications are working.</p>",
      });
      console.log(`✅ SendGrid accepted the send to ${to}. Check that inbox (and spam).`);
    } catch (err) {
      anyRejected = true;
      console.error(`\n❌ SendGrid rejected the send to ${to}. Exact reason:\n` + getErrorDetail(err));
    }
  }

  if (anyRejected) {
    console.error("\nFix hints:");
    console.error("  1. Verify the FROM address/domain under SendGrid -> Settings -> Sender Authentication.");
    console.error("     An unverified sender makes SendGrid return 403 on EVERY email (both order AND team).");
    console.error("  2. A free webmail FROM (gmail/yahoo/etc.) is usually the problem — use a verified");
    console.error("     domain you own (e.g. noreply@kenytinternational.com).");
    console.error("  3. Make sure the API key is valid and has 'Mail Send' permission.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});