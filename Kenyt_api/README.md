# wialon-tracker

Polls Control-Tech (Wialon-hosted) for live truck GPS positions and stores
them in your Postgres DB, for use in the allocation logic on kenyt-ops-api.

## How auth works (no API token needed)

Since your Wialon user account doesn't have Fleetrun/token-creator access,
this replicates the exact login flow Control-Tech's own web app uses:

1. `POST /oauth/authorize.html` with your login + password -> Wialon
   redirects with an `access_hash` in the URL.
2. `GET /wialon/ajax.html?svc=core/use_auth_hash` with that hash -> returns
   a session id (`sid`).
3. `GET /wialon/ajax.html?svc=core/search_items` with that `sid` -> returns
   every truck's name, id, and last known position in one call.

The poller re-runs steps 1-2 automatically once an hour (sessions can
expire) and re-runs step 3 every `POLL_INTERVAL_MINUTES`.


## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your (new) credentials and
   your `DATABASE_URL`.
3. Add the missing column + table to your DB:
   ```
   psql $DATABASE_URL -f migrate.sql
   ```
4. Map each truck to its Control-Tech unit ID. Run the poller once to see
   unit IDs and names that don't have a match yet:
   ```
   npm run once
   ```
   It will log skipped units like `KENYT-KDJ 838N (unit 30223126)`. For
   each one, update your trucks table:
   ```sql
   UPDATE trucks SET control_tech_unit_id = 30223126 WHERE registration = 'KDJ 838N';
   ```
5. Once all trucks are mapped, run continuously:
   ```
   npm start
   ```
   (In production, run this under a process manager like pm2 or as a
   systemd service / Docker container, not a bare terminal.)

## If login stops working

The `sign` value in `wialonClient.js` was captured from Control-Tech's
frontend and appeared static during testing, but if `APP_CONFIG` changes
on their end, `getAccessHash` will start throwing an error. To fix:

1. Log into Control-Tech in a browser with DevTools open (Network tab,
   filter `authorize.html`).
2. Log in fresh, click on the `oauth/authorize.html` request, open the
   Payload tab.
3. Copy the new `sign` and `client_id` values into `APP_CONFIG` in
   `wialonClient.js`.

## Using positions in allocation logic

Query `truck_positions` joined to `trucks` and your `orders` table's
pickup lat/lon. A simple straight-line (haversine) distance is enough for
ranking candidate trucks; swap in a routing API later if you want
driving-distance accuracy.
