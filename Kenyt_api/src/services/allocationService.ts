import { prisma } from "../lib/prisma";
import { haversineDistance } from "../utils/distance";
import { sendAllocationNotification } from "./email.service";

export async function findBestTruck(orderId: number, truckId?: number) {
  // ----------------------------------------------------
  // Load Order
  // ----------------------------------------------------
  const order = await prisma.order.findUnique({
    where: {
      orderId,
    },
    include: {
      pickupLocation: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (!order.pickupLocation) {
    throw new Error("Order does not have a pickup location.");
  }

  // ----------------------------------------------------
  // Load available trucks together with their GPS
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // Capacity + GPS filter
  // ----------------------------------------------------
  const eligibleTrucks = trucks.filter((truck) => {
    if (!truck.location) return false;

    if (truck.capacity_tonnes == null) return false;

    return (
      Number(truck.capacity_tonnes) >=
      Number(order.cargoWeightTonnes)
    );
  });

  if (eligibleTrucks.length === 0) {
    throw new Error(
      "No available truck can carry this cargo."
    );
  }

  // ----------------------------------------------------
  // If a specific truck was selected, use it
  // ----------------------------------------------------
  let selectedTruck;

  if (truckId != null) {
    selectedTruck = eligibleTrucks.find(
      (t) => t.truckId === truckId
    );

    if (!selectedTruck) {
      throw new Error(
        "Selected truck is not available or cannot carry this cargo."
      );
    }
  } else {
    // ----------------------------------------------------
    // Calculate distance to pickup
    // ----------------------------------------------------
    const ranked = eligibleTrucks.map((truck) => {
      const distance = haversineDistance(
        Number(truck.location!.lat),
        Number(truck.location!.lng),

        Number(order.pickupLocation.latitude),
        Number(order.pickupLocation.longitude)
      );

      return {
        truck,
        distance,
      };
    });

    // ----------------------------------------------------
    // Sort nearest first
    // ----------------------------------------------------
    ranked.sort((a, b) => a.distance - b.distance);

    selectedTruck = ranked[0].truck;
  }

  // ----------------------------------------------------
  // Save Allocation
  // ----------------------------------------------------
  const allocation = await prisma.allocation.create({
    data: {
      orderId: order.orderId,
      truckId: selectedTruck.truckId,
    },
  });

  // ----------------------------------------------------
  // Update truck
  // ----------------------------------------------------
  await prisma.truck.update({
    where: {
      truckId: selectedTruck.truckId,
    },
    data: {
      status: "assigned",
    },
  });

  // ----------------------------------------------------
  // Update order
  // ----------------------------------------------------
  await prisma.order.update({
    where: {
      orderId: order.orderId,
    },
    data: {
      status: "allocated",
    },
  });

  // ----------------------------------------------------
  // Send email notification to the team
  // ----------------------------------------------------
  try {
    await sendAllocationNotification({
      orderId: order.orderId,
      bolNumber: order.bolNumber,
      customerName: order.customerName,
      truckRegistration: selectedTruck.registration_number,
      truckCapacity: selectedTruck.capacity_tonnes
        ? String(selectedTruck.capacity_tonnes)
        : null,
    });
  } catch (notifErr) {
    console.warn(
      { err: notifErr },
      "Allocation completed but notification email failed to send"
    );
  }

  // ----------------------------------------------------
  // Return result
  // ----------------------------------------------------
  return {
    allocation,
    selectedTruck: {
      truckId: selectedTruck.truckId,
      registration: selectedTruck.registration_number,
      capacity: selectedTruck.capacity_tonnes,
    },
  };
}
