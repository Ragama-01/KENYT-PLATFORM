/**
 * Gmail REST API email client (replaces SMTP).
 *
 * Instead of connecting to smtp.gmail.com on port 465 (which is often blocked,
 * throttled, or times out on hosting platforms like Railway), emails are sent
 * over plain HTTPS by calling Google's Gmail API:
 *
 *   POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
 *
 * Authentication uses OAuth2:
 *   - GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET  from a Google Cloud OAuth client
 *   - GMAIL_REFRESH_TOKEN                    a long-lived refresh token
 *                                            (generate once with: npm run gmail:auth)
 *   - GMAIL_USER                             the Gmail address to send from
 *
 * The short-lived access token is cached in memory and refreshed automatically
 * before each send when it has expired (access tokens last ~1 hour).
 * No extra npm dependencies are required — uses the built-in fetch (Node 18+).
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export function isGmailApiConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN &&
      process.env.GMAIL_USER
  );
}

// ---------------------------------------------------------------------------
// Access-token management
// ---------------------------------------------------------------------------

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function fetchAccessToken(): Promise<{ token: string; expiresInSec: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID || "",
      client_secret: process.env.GMAIL_CLIENT_SECRET || "",
      refresh_token: process.env.GMAIL_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json()) as TokenResponse;

  if (!res.ok || !data.access_token) {
    throw new Error(
      `Gmail OAuth2 token refresh failed (HTTP ${res.status}): ` +
        `${data.error || "unknown"} — ${data.error_description || "no description"}`
    );
  }

  return {
    token: data.access_token,
    expiresInSec: data.expires_in || 3600,
  };
}

/** Get a valid access token, refreshing the cached one if it is near expiry. */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Refresh 60s early to avoid using a token that expires mid-request.
  if (cachedAccessToken && now < tokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const { token, expiresInSec } = await fetchAccessToken();
  cachedAccessToken = token;
  tokenExpiresAt = now + expiresInSec * 1000;
  return token;
}

// ---------------------------------------------------------------------------
// MIME message building
// ---------------------------------------------------------------------------

/** Minimal RFC 822 message with an HTML body. Recipients are plain addresses. */
function buildRawMime(from: string, to: string, subject: string, html: string): string {
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html, "utf-8").toString("base64"),
  ].join("\r\n");
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

interface SendResult {
  id?: string;
  threadId?: string;
}

/**
 * Send an HTML email via the Gmail REST API.
 * Throws with the full API error message on failure.
 */
export async function sendViaGmailApi(
  to: string,
  subject: string,
  html: string,
  from: string
): Promise<SendResult> {
  const accessToken = await getAccessToken();

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: Buffer.from(buildRawMime(from, to, subject, html), "utf-8").toString(
        "base64url"
      ),
    }),
  });

  const data = (await res.json()) as SendResult & {
    error?: { message?: string; status?: string };
  };

  if (!res.ok) {
    throw new Error(
      `Gmail API send failed (HTTP ${res.status}): ` +
        `${data.error?.status || "unknown"} — ${data.error?.message || "no message"}`
    );
  }

  return data;
}