import { prisma } from "../lib/prisma";
import { haversineDistance } from "../utils/distance";
import { sendAllocationNotification } from "./email.service";
import { maxCargoForTruck } from "../utils/capacity";

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

    const maxCargo = maxCargoForTruck(truck.capacity_tonnes);
    if (maxCargo == null) return false;

    // Above 28 t (e.g. 40 t) can carry any cargo.
    if (maxCargo === Infinity) return true;

    return Number(order.cargoWeightTonnes) <= maxCargo;
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
// ---------------------------------------------------------------------
// Batch allocation: assign MULTIPLE orders (e.g. two 20ft loads) to
// ONE truck in a single action. The combined cargo weight must fit the truck's
// capacity label (via maxCargoForTruck), so a single larger truck can carry
// two smaller loads at once.
// ---------------------------------------------------------------------
export async function allocateBatch(orderIds: number[], truckId: number) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new Error("orderIds is required (select at least one order)。");
  }

  const ids = [...new Set(orderIds)];

  const truck = await prisma.truck.findUnique(
    { where: { truckId } }
  );

  if (!truck) throw new Error("Truck not found");

  if (truck.status !== "available") {

    throw new Error("Truck " + truck.registration_number + " is not available (status: " + truck.status + ")..");
  }

  const orders = await prisma.order.findMany(
    {
      where: { orderId: { in: ids } },
      include: { pickupLocation: true },
    }
  );

  if (orders.length !== ids.length) throw new Error("Some of the selected orders were not found..");

  if (orders.some((o) => o.status === "allocated")) {
    throw new Error("One of the selected orders is already allocated..");
  }

  let totalWeight = 0;


  for (const o of orders) {
    totalWeight += Number(o.cargoWeightTonnes);
  }

  const maxCargo = maxCargoForTruck(truck.capacity_tonnes);


  if (maxCargo == null) throw new Error("Truck has no declared capacity..");

  if (maxCargo !== Infinity && totalWeight > maxCargo) {

    throw new Error(
      "Combined load (" + totalWeight.toFixed(2) + " t) exceeds truck capacity (" + maxCargo + " t). Split loads or pick a bigger truck.");
  }

  for (const o of orders) {
    if (!o.pickupLocation) throw new Error("Order " + o.bolNumber + " has no pickup location..");
  }

  const allocations = await prisma.allocation.createMany(
    {
      data: orders.map((o) => ({
        orderId: o.orderId,
        truckId: truck.truckId,
      })),
    }
  );

  await prisma.order.updateMany(
    { where: { orderId: { in: ids } }, data: { status: "allocated" } }
  );

  await prisma.truck.update(
    { where: { truckId }, data: { status: "assigned" } }
  );

  try {
    await sendAllocationNotification(
      {
        orderId: orders[0].orderId,
        bolNumber: orders.map((o) => o.bolNumber).join(", "),
        customerName: orders[0].customerName,
        truckRegistration: truck.registration_number,
        truckCapacity: truck.capacity_tonnes
          ? String(truck.capacity_tonnes)
          : null,
      }
    );
  } catch (e) {
    console.warn({ err: e }, "Allocation completed but notification email failed to send");
  }

  return {
    allocations,
    orders: orders.map((o) => ({

      orderId: o.orderId,
      bolNumber: o.bolNumber,
      status: "allocated",
    })),
    truck: {
      truckId: truck.truckId,
      registration: truck.registration_number,
      capacity: truck.capacity_tonnes,
      totalWeight,
      count: orders.length,
    },
  };
}
