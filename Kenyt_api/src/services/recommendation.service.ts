import { prisma } from "../lib/prisma";
import { calculateDistanceKm } from "./distance.service";
import { maxCargoForTruck } from "../utils/capacity";

export interface TruckCandidate {
  truckId: number;
  registration: string;
  capacity: number;
  distanceKm: number;
  currentLocation: string | null;
  hasExistingOrder: boolean;
  currentOrderDestination: string | null;
  lastAllocatedAt: string | null;
}

export interface TruckRecommendation {
  orderId: number;
  cargoWeightTonnes: number;
  pickupLocation: string;
  deliveryLocation: string;
  trucks: TruckCandidate[];
  containers: Array<{
    containerId: number;
    containerNumber: string;
    containerType: string | null;
    weightTonnes: number;
    cargoType: string;
  }>;
}

export async function recommendTruck(orderId: number): Promise<TruckRecommendation> {
  // Find the order with its pickup and delivery locations
  const order = await prisma.order.findUnique({
    where: {
      orderId,
    },
    include: {
      pickupLocation: true,
      deliveryLocation: true,
      containers: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (!order.pickupLocation) {
    throw new Error("Order does not have a pickup location.");
  }

  // Find available trucks together with their latest location
  // and any existing allocations/orders
  const trucks = await prisma.truck.findMany({
    where: {
      status: "available",
    },
    include: {
      location: true,
      allocations: {
        include: {
          order: {
            include: {
              deliveryLocation: true,
            },
          },
        },
        orderBy: {
          allocatedAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (trucks.length === 0) {
    throw new Error("No available trucks.");
  }

  // Load all locations for reverse geocoding truck positions
  const locations = await prisma.location.findMany();

  const candidates: TruckCandidate[] = [];

  for (const truck of trucks) {
    // Skip trucks without a GPS location
    if (!truck.location) continue;

    // Skip trucks that can't carry the cargo (uses the capacity-label rule:
    // 26 t -> carries <= 20 t, 28 t -> carries <= 28 t, above 28 t -> any cargo)
    const maxCargo = maxCargoForTruck(truck.capacity_tonnes);
    if (
      maxCargo == null ||
      (maxCargo !== Infinity && Number(order.cargoWeightTonnes) > maxCargo)
    ) {
      continue;
    }

    const distance = calculateDistanceKm(
      Number(truck.location.lat),
      Number(truck.location.lng),
      Number(order.pickupLocation.latitude),
      Number(order.pickupLocation.longitude)
    );

    // Find the nearest known location name for the truck's current position
    let currentLocation: string | null = null;
    let minDist = Infinity;

    for (const loc of locations) {
      const d = calculateDistanceKm(
        Number(truck.location.lat),
        Number(truck.location.lng),
        Number(loc.latitude),
        Number(loc.longitude)
      );

      if (d < minDist) {
        minDist = d;
        currentLocation = loc.name;
      }
    }

    // Check if the truck has an existing allocation/order
    const latestAllocation = truck.allocations[0];
    const hasExistingOrder = !!latestAllocation;
    const currentOrderDestination =
      latestAllocation?.order?.deliveryLocation?.name ?? null;
    const lastAllocatedAt = latestAllocation?.allocatedAt
      ? latestAllocation.allocatedAt.toISOString()
      : null;

    candidates.push({
      truckId: truck.truckId,
      registration: truck.registration_number,
      capacity: Number(truck.capacity_tonnes),
      distanceKm: Number(distance.toFixed(2)),
      currentLocation,
      hasExistingOrder,
      currentOrderDestination,
      lastAllocatedAt,
    });
  }

  if (candidates.length === 0) {
    throw new Error("No available truck can carry this cargo.");
  }

  // Sort nearest first
  candidates.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    orderId: order.orderId,
    cargoWeightTonnes: Number(order.cargoWeightTonnes),
    pickupLocation: order.pickupLocation.name,
    deliveryLocation: order.deliveryLocation?.name ?? "Unknown",
    trucks: candidates,
    containers: order.containers.map((c) => ({
      containerId: c.containerId,
      containerNumber: c.containerNumber,
      containerType: c.containerType,
      weightTonnes: Number(c.weightTonnes),
      cargoType: c.cargoType,
    })),
  };
}
