import crypto from "crypto";
import bcrypt from "bcrypt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";

/**
 * Google Sign-In ("Sign in with Google") routes.
 *
 *  - GET /auth/google           -> redirects the browser to Google's consent screen
 *  - GET /auth/google/callback  -> Google redirects here with ?code=...&state=...
 *                                  Exchanges the code for an id_token, finds or
 *                                  creates the User, then redirects the browser
 *                                  back to the frontend with the user payload.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET  (Google Cloud Console -> Credentials
 *     -> OAuth client ID -> Web application. Add BOTH redirect URIs:
 *       http://localhost:4000/auth/google/callback        (local dev)
 *       https://<your-backend>.up.railway.app/auth/google/callback  (Railway))
 *   GOOGLE_AUTH_FRONTEND_URL  (optional) — where to send the browser after login,
 *     e.g. https://kenyt-international.up.railway.app  (the FRONTEND service).
 *     Falls back to the request's Origin header, then http://localhost:5173.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const pendingStates = new Map<string, { redirectUri: string; expiresAt: number }>();

function pruneExpiredStates(): void {
  const now = Date.now();
  for (const [key, value] of pendingStates) {
    if (value.expiresAt < now) pendingStates.delete(key);
  }
}

function callbackBaseUrl(request: FastifyRequest): string {
  const configured =
    process.env.GOOGLE_AUTH_PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
  if (configured) {
    const trimmed = configured.trim().replace(/\/+$/, "");
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  const proto =
    (request.headers["x-forwarded-proto"] as string | undefined) || request.protocol;
  return `${proto}://${request.headers.host}`;
}

function frontendBaseUrl(request: FastifyRequest): string {
  const configured = process.env.GOOGLE_AUTH_FRONTEND_URL;
  if (configured) {
    const trimmed = configured.trim().replace(/\/+$/, "");
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  const origin = request.headers.origin as string | undefined;
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/+$/, "");
  return "http://localhost:5173";
}

/** Decode the payload of an id_token JWT (arrives directly from Google over TLS). */
function decodeIdToken(idToken: string): { email?: string; name?: string } | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

// __ROUTES__

export default async function googleAuthRoutes(app: FastifyInstance) {
  const credsReady = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  /** Start the sign-in flow: redirect the browser to Google's consent screen. */
  app.get("/auth/google", async (request, reply) => {
    if (!credsReady) {
      return reply.status(503).send({
        error: "google_oauth_not_configured",
        message:
          "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on this service first.",
      });
    }

    pruneExpiredStates();

    const redirectUri = `${callbackBaseUrl(request)}/auth/google/callback`;
    const state = crypto.randomBytes(16).toString("hex");
    pendingStates.set(state, { redirectUri, expiresAt: Date.now() + 10 * 60_000 });

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");

    return reply.redirect(authUrl.toString());
  });

  /** Google redirects here after the user approves. */
  app.get("/auth/google/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };
    const frontend = frontendBaseUrl(request);

    if (query.error) {
      return reply.redirect(
        `${frontend}/?google_error=${encodeURIComponent(query.error)}`
      );
    }

    const stateEntry = query.state ? pendingStates.get(query.state) : undefined;
    if (!query.code || !query.state || !stateEntry || stateEntry.expiresAt < Date.now()) {
      return reply.redirect(`${frontend}/?google_error=invalid_state`);
    }
    pendingStates.delete(query.state);

    if (!credsReady) {
      return reply.redirect(`${frontend}/?google_error=not_configured`);
    }

    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: query.code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: stateEntry.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const data = (await tokenRes.json()) as {
        id_token?: string;
        error_description?: string;
      };
      const claims = data.id_token ? decodeIdToken(data.id_token) : null;

      if (!tokenRes.ok || !claims?.email) {
        request.log.error(
          { err: data.error_description || data },
          "[google-auth] Token exchange failed"
        );
        return reply.redirect(`${frontend}/?google_error=token_exchange_failed`);
      }

      const email = claims.email.toLowerCase().trim();
      const fullName = (claims.name || email.split("@")[0] || "Google User").trim();

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // First Google sign-in for this email: create the account. The password
        // column is NOT NULL, so store an unusable random hash.
        user = await prisma.user.create({
          data: {
            email,
            fullName,
            password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
            role: "user",
          },
        });
      }

      if (!user.isActive) {
        return reply.redirect(`${frontend}/?google_error=account_disabled`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Same sessionless pattern as POST /auth/login: hand the user record back
      // to the frontend (base64url-encoded) which decodes it and sets app state.
      const safeUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      const payload = Buffer.from(JSON.stringify(safeUser), "utf-8").toString(
        "base64url"
      );

      return reply.redirect(`${frontend}/?google_user=${payload}`);
    } catch (err) {
      request.log.error({ err }, "[google-auth] Callback failed");
      return reply.redirect(`${frontend}/?google_error=callback_failed`);
    }
  });
}
