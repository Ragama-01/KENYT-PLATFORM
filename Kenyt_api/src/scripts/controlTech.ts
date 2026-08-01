// Truck location lookup — reads from the truck_locations table, which
// is populated on a schedule by scrapeTruckLocations.ts (since
// Control-Tech has no API, only a dashboard we log into and scrape).
//
// This keeps AllocationForm and everything else decoupled from HOW the
// location data gets there — if Control-Tech ever ships a real API,
// only this file changes; everything downstream stays the same.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TruckLocation {
  lat: number;
  lng: number;
  as_of: string;
}

// Positions older than this are treated as stale and returned as
// "unknown" rather than shown as current — an 8-hour-old fix is
// worse than useless for allocation, it's actively misleading.
const STALE_AFTER_MINUTES = 30;

export async function getTruckLocation(truckId: number): Promise<TruckLocation | null> {
  const row = await prisma.truckLocation.findUnique({ where: { truckId } });
  if (!row) return null;

  const ageMinutes = (Date.now() - row.asOf.getTime()) / 1000 / 60;
  if (ageMinutes > STALE_AFTER_MINUTES) return null;

  return {
    lat: Number(row.lat),
    lng: Number(row.lng),
    as_of: row.asOf.toISOString(),
  };
}
