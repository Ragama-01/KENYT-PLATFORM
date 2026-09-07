import "dotenv/config";
import http from "http";
import { URL } from "url";

// One-time helper: generates a Gmail API refresh token for the sender account.
//
//   1. Google Cloud Console -> APIs & Services -> enable "Gmail API".
//   2. Credentials -> Create OAuth client ID -> "Web application".
//      Add authorized redirect URI: http://localhost:53682/oauth2callback
//      (For testing against your RAILWAY deployment you don't need this
//      script at all — see the Railway flow in the root README.md: add
//      https://<your-backend>.up.railway.app/oauth2callback as a second
//      redirect URI, then open https://<your-backend>.up.railway.app/gmail/auth
//      and copy the refresh token it shows into Railway's GMAIL_REFRESH_TOKEN.)
//   3. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env.
//   4. Run:  npm run gmail:auth
//      A browser window opens; sign in as the GMAIL_USER account and approve.
//      The refresh token is printed — copy it into .env as GMAIL_REFRESH_TOKEN.
//
// Note: while your OAuth consent screen is in "Testing" mode the refresh token
// stays valid as long as it is used at least once every 7 days; publish the
// app (still private, just "In production") to remove that expiry.

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost:53682/oauth2callback";
const SCOPE = "https://www.googleapis.com/auth/gmail.send";
const PORT = 53682;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "❌ GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET not set. Create an OAuth client in Google Cloud Console first."
  );
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", REDIRECT_URI);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/html" }).end(
      `<h3>Authorization failed: ${error || "no code returned"}</h3>`
    );
    console.error("❌ Authorization failed:", error || "no code returned");
    server.close();
    process.exit(1);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const data = (await tokenRes.json()) as {
      refresh_token?: string;
      access_token?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !data.refresh_token) {
      throw new Error(
        data.error_description ||
          "No refresh_token returned. Re-run and make sure to approve the consent screen (prompt=consent is already set)."
      );
    }

    console.log("\n✅ Success! Add these to your .env / Railway variables:\n");
    console.log(`GMAIL_REFRESH_TOKEN=${data.refresh_token}\n`);

    res.writeHead(200, { "Content-Type": "text/html" }).end(
      "<h3>✅ Refresh token generated. Check the terminal, then copy GMAIL_REFRESH_TOKEN into your .env.</h3>"
    );
  } catch (err) {
    console.error("❌ Token exchange failed:", err);
    res.writeHead(500, { "Content-Type": "text/html" }).end(
      "<h3>Token exchange failed — check the terminal.</h3>"
    );
  }

  server.close();
});

console.log("Opening browser for Google consent...\n");
console.log(authUrl.toString() + "\n");
console.log(
  `If the browser does not open automatically, paste the URL above into your browser. Waiting on http://localhost:${PORT} ...`
);

// Best-effort auto-open on Windows/macOS/Linux.
import { exec } from "child_process";
const opener =
  process.platform === "win32"
    ? `start "" "${authUrl.toString()}"`
    : process.platform === "darwin"
      ? `open "${authUrl.toString()}"`
      : `xdg-open "${authUrl.toString()}"`;
exec(opener, () => {
  /* ignore errors — user can open the URL manually */
});

server.listen(PORT, () => {
  /* server ready */
});