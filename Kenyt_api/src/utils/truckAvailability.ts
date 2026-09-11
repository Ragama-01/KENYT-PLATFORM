import { prisma } from "../lib/prisma";
import { haversineDistance } from "./distance";

/**
 * How close (km) an assigned truck must be to its active delivery location
 * before it can be offered for a new allocation ("almost arriving").
 */
export const NEAR_DESTINATION_KM = 100;

type TruckWithGps = {
  truckId: number;
  registration_number: string;
  status: string;
  location: { lat: unknown; lng: unknown } | null;
};

/**
 * True when the truck is free, or assigned but GPS shows it within
 * NEAR_DESTINATION_KM of the delivery point of an active (non-completed) allocation.
 */
export async function isTruckAllocatableNow(
  truck: TruckWithGps
): Promise<{ ok: boolean; reason?: string; nearDestinationKm?: number }> {
  if (truck.status === "available") {
    return { ok: true };
  }

  if (truck.status === "maintenance") {
    return {
      ok: false,
      reason: `Truck ${truck.registration_number} is in maintenance.`,
    };
  }

  // assigned / in_transit: allow only when near an active delivery destination
  if (truck.status !== "assigned" && truck.status !== "in_transit") {
    return {
      ok: false,
      reason: `Truck ${truck.registration_number} is not available (status: ${truck.status}).`,
    };
  }

  if (!truck.location) {
    return {
      ok: false,
      reason: `Truck ${truck.registration_number} has no GPS location, so proximity to destination cannot be checked.`,
    };
  }

  const active = await prisma.allocation.findMany({
    where: {
      truckId: truck.truckId,
      status: { not: "completed" },
    },
    include: {
      order: {
        include: { deliveryLocation: true },
      },
    },
    orderBy: { allocatedAt: "desc" },
  });

  if (active.length === 0) {
    // Status says busy but no open allocation — treat as allocatable
    return { ok: true };
  }

  let bestKm = Infinity;
  for (const a of active) {
    const dest = a.order?.deliveryLocation;
    if (!dest) continue;
    const km = haversineDistance(
      Number(truck.location.lat),
      Number(truck.location.lng),
      Number(dest.latitude),
      Number(dest.longitude)
    );
    if (km < bestKm) bestKm = km;
  }

  if (bestKm === Infinity) {
    return {
      ok: false,
      reason: `Truck ${truck.registration_number} is on a trip with no delivery coordinates.`,
    };
  }

  if (bestKm <= NEAR_DESTINATION_KM) {
    return { ok: true, nearDestinationKm: Number(bestKm.toFixed(2)) };
  }

  return {
    ok: false,
    reason: `Truck ${truck.registration_number} is still ${bestKm.toFixed(1)} km from destination (must be within ${NEAR_DESTINATION_KM} km to allocate again).`,
    nearDestinationKm: Number(bestKm.toFixed(2)),
  };
}

/**
 * Load trucks that can take a new job now: status available, or assigned/in_transit
 * and within NEAR_DESTINATION_KM of their current delivery.
 */
export async function findAllocatableTrucks(opts?: {
  truckIds?: number[];
  includeLocation?: boolean;
}) {
  const trucks = await prisma.truck.findMany({
    where: {
      status: { in: ["available", "assigned", "in_transit"] },
      ...(opts?.truckIds?.length
        ? { truckId: { in: opts.truckIds } }
        : {}),
    },
    include: {
      location: true,
      allocations: {
        where: { status: { not: "completed" } },
        include: {
          order: { include: { deliveryLocation: true } },
        },
        orderBy: { allocatedAt: "desc" },
        take: 5,
      },
    },
  });

  const out: Array<
    (typeof trucks)[number] & {
      allocatableReason: "available" | "near_destination";
      kmToCurrentDestination: number | null;
    }
  > = [];

  for (const truck of trucks) {
    if (truck.status === "available") {
      out.push({
        ...truck,
        allocatableReason: "available",
        kmToCurrentDestination: null,
      });
      continue;
    }

    if (!truck.location) continue;

    let bestKm = Infinity;
    for (const a of truck.allocations) {
      const dest = a.order?.deliveryLocation;
      if (!dest) continue;
      const km = haversineDistance(
        Number(truck.location.lat),
        Number(truck.location.lng),
        Number(dest.latitude),
        Number(dest.longitude)
      );
      if (km < bestKm) bestKm = km;
    }

    // No open allocation with coords but status busy — still allow
    if (truck.allocations.length === 0) {
      out.push({
        ...truck,
        allocatableReason: "available",
        kmToCurrentDestination: null,
      });
      continue;
    }

    if (bestKm <= NEAR_DESTINATION_KM) {
      out.push({
        ...truck,
        allocatableReason: "near_destination",
        kmToCurrentDestination:
          bestKm === Infinity ? null : Number(bestKm.toFixed(2)),
      });
    }
  }

  return out;
}
