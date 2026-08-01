import { prisma } from "../lib/prisma";
import { calculateDistanceKm } from "./distance.service";

export interface TruckCandidate {
  truckId: number;
  registration: string;
  capacity: number;
  distanceKm: number;
}

export interface TruckRecommendation {
  orderId: number;
  cargoWeightTonnes: number;
  pickupLocation: string;
  trucks: TruckCandidate[];
}

export async function recommendTruck(orderId: number): Promise<TruckRecommendation> {
  // Find the order with its pickup location
  const order = await prisma.order.findUnique({
    where: {
      orderId,
    },
    include: {
      pickupLocation: true,
      deliveryLocation: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (!order.pickupLocation) {
    throw new Error("Order does not have a pickup location.");
  }

  // Find available trucks together with their latest location
  const trucks = await prisma.truck.findMany({
    where: {
      status: "available",
    },
    include: {
      location: true,
    },
  });

  if (trucks.length === 0) {
    throw new Error("No available trucks.");
  }

  const candidates: TruckCandidate[] = [];

  for (const truck of trucks) {
    // Skip trucks without a GPS location
    if (!truck.location) continue;

    // Skip trucks that can't carry the cargo
    if (
      truck.capacity_tonnes == null ||
      Number(truck.capacity_tonnes) < Number(order.cargoWeightTonnes)
    ) {
      continue;
    }

    const distance = calculateDistanceKm(
      Number(truck.location.lat),
      Number(truck.location.lng),
      Number(order.pickupLocation.latitude),
      Number(order.pickupLocation.longitude)
    );

    candidates.push({
      truckId: truck.truckId,
      registration: truck.registration_number,
      capacity: Number(truck.capacity_tonnes),
      distanceKm: Number(distance.toFixed(2)),
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
    trucks: candidates,
  };
}