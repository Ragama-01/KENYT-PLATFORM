import crypto from "crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";

/**
 * Gmail OAuth2 routes — used to generate the GMAIL_REFRESH_TOKEN from your
 * deployed Railway backend (handy when you want to test against Railway
 * instead of running the local `npm run gmail:auth` script).
 *
 * One-time setup:
 *   1. In Google Cloud Console -> Credentials -> your OAuth client, add BOTH:
 *        - http://localhost:53682/oauth2callback                     (local script)
 *        - https://<your-backend>.up.railway.app/oauth2callback      (this flow)
 *   2. Open https://<your-backend>.up.railway.app/gmail/auth
 *   3. Approve the consent screen with the GMAIL_USER account.
 *   4. The callback page shows the refresh token — copy it into the
 *      GMAIL_REFRESH_TOKEN variable on Railway (and in your local .env).
 *
 * The redirect URI only matters for this initial consent; sending mail from
 * Railway later is a plain refresh-token -> access-token HTTPS exchange.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Short-lived storage for the anti-CSRF `state` value (single-instance API). */
const pendingStates = new Map<string, { redirectUri: string; expiresAt: number }>();

function pruneExpiredStates(): void {
  const now = Date.now();
  for (const [key, value] of pendingStates) {
    if (value.expiresAt < now) pendingStates.delete(key);
  }
}

/**
 * Public base URL of this deployment. Preference order:
 *   GMAIL_AUTH_PUBLIC_URL -> RAILWAY_PUBLIC_DOMAIN -> the incoming request's host.
 * (RAILWAY_PUBLIC_DOMAIN is a bare domain, e.g. "kenyt-api.up.railway.app".)
 */
function publicBaseUrl(request: FastifyRequest): string {
  const configured =
    process.env.GMAIL_AUTH_PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
  if (configured) {
    const trimmed = configured.trim().replace(/\/+$/, "");
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  const proto =
    (request.headers["x-forwarded-proto"] as string | undefined) || request.protocol;
  return `${proto}://${request.headers.host}`;
}

/** Decode the `email` claim from an id_token (JWT payload, no verification —
 * it arrives directly from Google over TLS as part of the token exchange). */
function decodeIdTokenEmail(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as {
      email?: string;
    };
    return json.email || null;
  } catch {
    return null;
  }
}

function page(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 48px auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="margin-top: 0;">${title}</h2>
      ${bodyHtml}
    </div>
  `;
}

export default async function oauthRoutes(app: FastifyInstance) {
  const credsReady = Boolean(
    process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET
  );

  /** Start the consent flow: redirects the browser to Google's OAuth screen. */
  app.get("/gmail/auth", async (request, reply) => {
    if (!credsReady) {
      return reply.status(503).send({
        error: "gmail_oauth_not_configured",
        message:
          "Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET on this service first.",
      });
    }

    pruneExpiredStates();

    const redirectUri = `${publicBaseUrl(request)}/oauth2callback`;
    const state = crypto.randomBytes(16).toString("hex");
    pendingStates.set(state, { redirectUri, expiresAt: Date.now() + 10 * 60_000 });

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", process.env.GMAIL_CLIENT_ID || "");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.send");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return reply.redirect(authUrl.toString());
  });

  /** Google redirects here after consent; exchange the code for tokens. */
  app.get("/oauth2callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };

    if (query.error) {
      return reply.status(400).type("text/html").send(
        page("Authorization failed", `<p>Google returned: <b>${query.error}</b></p>`)
      );
    }

    const stateEntry = query.state ? pendingStates.get(query.state) : undefined;
    if (!query.code || !query.state || !stateEntry || stateEntry.expiresAt < Date.now()) {
      return reply.status(400).type("text/html").send(
        page(
          "Invalid or expired session",
          "<p>The state parameter is missing, unknown or expired. Start again from <code>/gmail/auth</code>.</p>"
        )
      );
    }
    pendingStates.delete(query.state);

    if (!credsReady) {
      return reply.status(503).send({
        error: "gmail_oauth_not_configured",
        message:
          "Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET on this service first.",
      });
    }

    try {
      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: query.code,
          client_id: process.env.GMAIL_CLIENT_ID || "",
          client_secret: process.env.GMAIL_CLIENT_SECRET || "",
          redirect_uri: stateEntry.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const data = (await tokenRes.json()) as {
        refresh_token?: string;
        id_token?: string;
        error_description?: string;
      };

      if (!tokenRes.ok || !data.refresh_token) {
        return reply.status(400).type("text/html").send(
          page(
            "Token exchange failed",
            `<p>${data.error_description || "No refresh_token returned. Re-run and make sure to approve the consent screen."}</p>`
          )
        );
      }

      const authorizedEmail = data.id_token ? decodeIdTokenEmail(data.id_token) : null;
      const expectedUser = (process.env.GMAIL_USER || "").trim().toLowerCase();

      // Guard: only show the refresh token when the account that approved the
      // consent screen is the account this deployment sends from.
      if (expectedUser && authorizedEmail && authorizedEmail.toLowerCase() !== expectedUser) {
        return reply.status(403).type("text/html").send(
          page(
            "Wrong Google account",
            `<p>You approved with <b>${authorizedEmail}</b>, but this deployment sends from <b>${expectedUser}</b> (GMAIL_USER).</p>
             <p>Sign out or switch to the correct account and retry from <code>/gmail/auth</code>.</p>`
          )
        );
      }

      request.log.info(
        `[gmail-oauth] Refresh token generated for ${authorizedEmail || "unknown account"}`
      );

      return reply.type("text/html").send(
        page(
          "✅ Gmail refresh token generated",
          `
          <p>Authorized account: <b>${authorizedEmail || "unknown"}</b></p>
          <p>Add this to your Railway variables (and local <code>.env</code>):</p>
          <p style="background:#f3f4f6; padding:12px; border-radius:6px; word-break:break-all;">
            <code>GMAIL_REFRESH_TOKEN=<b>${data.refresh_token}</b></code>
          </p>
          <p style="color:#6b7280; font-size:13px;">
            Keep it secret — anyone with this token can send email as this account.
            You can now close this page.
          </p>
          `
        )
      );
    } catch (err) {
      request.log.error({ err }, "[gmail-oauth] Token exchange failed");
      return reply.status(500).type("text/html").send(
        page("Token exchange failed", "<p>Check the API logs for details.</p>")
      );
    }
  });
}