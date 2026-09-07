import "dotenv/config";
import { isGmailApiConfigured, sendViaGmailApi } from "../src/services/gmail.client";

// Diagnostic tool to find out exactly why email notifications are not arriving.
//
// It sends a real test email to the configured SUPER_USER_EMAIL via the Gmail
// REST API (HTTPS) and, if Gmail rejects it, prints the precise reason.
//
//   cd Kenyt_api
//   npm run email:test
//
// The most common causes surfaced here are:
//   1. GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN / GMAIL_USER
//      not fully set — run `npm run gmail:auth` to generate the refresh token.
//   2. The Gmail API is not enabled in the Google Cloud project.
//   3. EMAIL_FROM set to something other than GMAIL_USER or one of its
//      verified aliases (Gmail rewrites/repudiates other From addresses).

async function main(): Promise<void> {
  if (!isGmailApiConfigured()) {
    console.error(
      "❌ Gmail API is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, " +
        "GMAIL_REFRESH_TOKEN and GMAIL_USER (run `npm run gmail:auth` first), then retry."
    );
    process.exit(1);
  }

  const from = (process.env.EMAIL_FROM || process.env.GMAIL_USER || "").trim();
  const toList = (process.env.SUPER_USER_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log("[email:test] Resolved config:");
  console.log(`  Transport        : Gmail REST API (HTTPS)`);
  console.log(`  GMAIL_USER       : ${process.env.GMAIL_USER}`);
  console.log(`  Client ID        : ${process.env.GMAIL_CLIENT_ID}`);
  console.log(`  Refresh token    : set (len ${process.env.GMAIL_REFRESH_TOKEN!.length})`);
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
      const info = await sendViaGmailApi(
        to,
        "KENYT platform — email test",
        "<p>This is a test email from the KENYT platform. If you are reading this, Gmail API (HTTPS) notifications are working.</p>",
        from
      );
      console.log(`✅ Gmail accepted the send to ${to} (id: ${info.id}). Check that inbox (and spam).`);
    } catch (err) {
      anyRejected = true;
      console.error(`\n❌ Gmail API rejected the send to ${to}. Exact reason:\n${err}`);
    }
  }

  if (anyRejected) {
    console.error("\nFix hints:");
    console.error("  1. Enable the Gmail API: Google Cloud Console -> APIs & Services -> Library -> Gmail API.");
    console.error("  2. Make sure the OAuth consent screen includes the sending account as a test user (or is published).");
    console.error("  3. EMAIL_FROM must be the GMAIL_USER address itself or a verified alias of it.");
    console.error("  4. If the refresh token is stale/expired, regenerate with `npm run gmail:auth`.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});