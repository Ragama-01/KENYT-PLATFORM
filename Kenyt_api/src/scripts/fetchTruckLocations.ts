import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { loginToWialon, fetchAllUnitPositions } from "./wialonClient.js";

const POLL_INTERVAL_MS = (Number(process.env.POLL_INTERVAL_MINUTES) || 3) * 60 * 1000;
const SID_MAX_AGE_MS = 60 * 60 * 1000; // re-login hourly, sessions can expire
const RUN_ONCE = process.argv.includes("--once");

let sid: string | null = null;
let sidObtainedAt = 0;

async function ensureSession(): Promise<string> {
  const isStale = !sid || Date.now() - sidObtainedAt > SID_MAX_AGE_MS;
  if (isStale) {
    console.log("[wialon] Logging in...");
    sid = await loginToWialon(process.env.WIALON_LOGIN!, process.env.WIALON_PASSWORD!);
    sidObtainedAt = Date.now();
    console.log("[wialon] Login successful.");
  }
  return sid!;
}

async function pollOnce() {
  try {
    const sessionId = await ensureSession();
    const positions = await fetchAllUnitPositions(sessionId);

    let saved = 0;
    const skipped: { unitId: number; name: string }[] = [];

    for (const p of positions) {
      const truck = await prisma.truck.findUnique({
        where: { controlTechUnitId: p.controlTechUnitId },
        select: { truckId: true },
      });

      if (!truck) {
        skipped.push({ unitId: p.controlTechUnitId, name: p.name });
        continue;
      }

      await prisma.truckLocation.upsert({
        where: { truckId: truck.truckId },
        create: { truckId: truck.truckId, lat: p.latitude, lng: p.longitude, asOf: p.reportedAt },
        update: { lat: p.latitude, lng: p.longitude, asOf: p.reportedAt },
      });

      saved++;
    }

    console.log(
      `[wialon] ${new Date().toISOString()} -- fetched ${positions.length}, saved ${saved}, skipped ${skipped.length}`
    );

    if (skipped.length > 0) {
      console.log(
        "[wialon] Skipped (no truck.control_tech_unit_id match):",
        skipped.map((s) => `${s.name} (unit ${s.unitId})`).join(", ")
      );
    }
  } catch (err) {
    console.error("[wialon] Poll failed:", (err as Error).message);
    sid = null; // force re-login next attempt
  }
}

async function main() {
  await pollOnce();

  if (RUN_ONCE) {
    await prisma.$disconnect();
    return;
  }

  console.log(`[wialon] Polling every ${POLL_INTERVAL_MS / 60000} minute(s). Press Ctrl+C to stop.`);
  setInterval(pollOnce, POLL_INTERVAL_MS);
}

main();