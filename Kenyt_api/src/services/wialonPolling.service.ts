import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { loginToWialon, fetchAllUnitPositions } from "../scripts/wialonClient.js";
import { haversineDistance } from "../utils/distance.js";

const POLL_INTERVAL_MS = (Number(process.env.POLL_INTERVAL_MINUTES) || 60) * 60 * 1000;
const SID_MAX_AGE_MS = 60 * 60 * 1000; // re-login hourly, sessions can expire
const ARRIVAL_RADIUS_KM = 2; // Truck within 2km of destination = arrived

let sid: string | null = null;
let sidObtainedAt = 0;
let pollTimer: NodeJS.Timeout | null = null;
let isPolling = false;

async function ensureSession(): Promise<string> {
  const isStale = !sid || Date.now() - sidObtainedAt > SID_MAX_AGE_MS;
  if (isStale) {
    console.log("[wialon] Logging in...");
    sid = await loginToWialon(process.env.WIALON_LOGIN!, process.env.WIALON_PASSWORD!);
    sidObtainedAt = Date.now();
    console.log("[wialon] Login successful.");
  }
  if (!sid) {
    throw new Error("Wialon session ID is null after login");
  }
  return sid;
}

async function checkAndCompleteArrivals() {
  // Find all active allocations with delivery locations
  const activeAllocations = await prisma.allocation.findMany({
    where: {
      status: { not: "completed" },
    },
    include: {
      truck: {
        include: { location: true },
      },
      order: {
        include: { deliveryLocation: true },
      },
    },
  });

  for (const allocation of activeAllocations) {
    const truck = allocation.truck;
    const deliveryLocation = allocation.order?.deliveryLocation;

    if (!truck?.location || !deliveryLocation) continue;

    const distanceKm = haversineDistance(
      Number(truck.location.lat),
      Number(truck.location.lng),
      Number(deliveryLocation.latitude),
      Number(deliveryLocation.longitude)
    );

    if (distanceKm <= ARRIVAL_RADIUS_KM) {
      // Truck has arrived at destination - mark allocation as completed
      await prisma.$transaction(async (tx) => {
        // 1. Free the truck
        await tx.truck.update({
          where: { truckId: truck.truckId },
          data: { status: "available" },
        });

        // 2. Mark allocation completed with arrival time
        const arrivedAt = new Date();
        await tx.allocation.update({
          where: { allocationId: allocation.allocationId },
          data: { status: "completed", arrivedAt },
        });

        // 3. Check if order is fully delivered
        const remainingActive = await tx.allocation.count({
          where: {
            orderId: allocation.orderId,
            status: { not: "completed" },
          },
        });

        if (remainingActive === 0) {
          await tx.order.update({
            where: { orderId: allocation.orderId },
            data: { status: "delivered" },
          });
        }

        console.log(
          `[wialon] Auto-completed allocation ${allocation.allocationId} for truck ${truck.registration_number} (${distanceKm.toFixed(2)} km from destination)`
        );
      });
    }
  }
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

    // Check for arrivals after updating locations
    await checkAndCompleteArrivals();
  } catch (err) {
    console.error("[wialon] Poll failed:", (err as Error).message);
    sid = null; // force re-login next attempt
  }
}

export function startWialonPolling(): Promise<void> {
  if (isPolling) {
    console.log("[wialon] Polling already running");
    return Promise.resolve();
  }

  isPolling = true;
  console.log(`[wialon] Starting polling every ${POLL_INTERVAL_MS / 60000} minute(s)`);

  // Run immediately
  return pollOnce().then(() => {
    // Then schedule recurring polls
    pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
  });
}

export function stopWialonPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isPolling = false;
  console.log("[wialon] Polling stopped");
}