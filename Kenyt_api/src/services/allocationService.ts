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
      bolNumber: order.bolNumber ?? "N/A",
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
        bolNumber: orders.map((o) => o.bolNumber ?? "N/A").join(", "),
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

// ---------------------------------------------------------------------
// Container-level allocation: assign the containers of ONE order to ONE
// or SEVERAL trucks. Each container records which truck carries it, and an
// allocation row is created for every distinct truck selected. The combined
// weight assigned to each truck must fit that truck's capacity.
// Body: { orderId: number, assignments: [{ containerId, truckId }] }
// ---------------------------------------------------------------------
export interface ContainerAssignment {
  containerId: number;
  truckId: number;
}

// ---------------------------------------------------------------------
// Arrival at destination: release a truck back to "available" once it has
// reached the delivery point. Marks the allocation as completed and, when
// this was the last active allocation for the order, marks the order as
// delivered. Works for single- and multi-truck orders alike (each truck is
// released independently via its own allocation).
// ---------------------------------------------------------------------
export async function markAllocationArrived(allocationId: number) {
  const allocation = await prisma.allocation.findUnique({
    where: { allocationId },
    include: {
      truck: true,
      order: true,
    },
  });

  if (!allocation) throw new Error("Allocation not found.");

  if (allocation.status === "completed") {
    throw new Error("This allocation is already marked as arrived.");
  }

  // 1. Free the truck so it is available for a new assignment.
  if (allocation.truck) {
    await prisma.truck.update({
      where: { truckId: allocation.truckId },
      data: { status: "available" },
    });
  }

  // 2. Mark this allocation completed.
  await prisma.allocation.update({
    where: { allocationId },
    data: { status: "completed" },
  });

  // 3. If no other active (non-completed) allocation remains for the order,
  //    the whole delivery is done -> mark the order as delivered.
  const remainingActive = await prisma.allocation.count({
    where: {
      orderId: allocation.orderId,
      status: { not: "completed" },
    },
  });

  let orderStatus: string | undefined;
  if (remainingActive === 0) {
    await prisma.order.update({
      where: { orderId: allocation.orderId },
      data: { status: "delivered" },
    });
    orderStatus = "delivered";
  }

  return {
    allocationId,
    orderId: allocation.orderId,
    orderStatus,
    truck: {
      truckId: allocation.truckId,
      registration: allocation.truck
        ? allocation.truck.registration_number
        : "",
      status: "available",
    },
  };
}

export async function allocateOrderTrucks(
  orderId: number,
  assignments: ContainerAssignment[]
) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new Error("Assign at least one container to a truck.");
  }

  const order = await prisma.order.findUnique({
    where: { orderId },
    include: { containers: true },
  });

  if (!order) throw new Error("Order not found");
  if (order.status === "allocated") {
    throw new Error("Order is already allocated.");
  }

  const containers = order.containers;

  if (containers.length === 0) {
    throw new Error(
      "This order has no container records. Use the single-truck allocation for legacy (whole-load) orders."
    );
  }

  // containerId -> truckId (dedupe; last one wins)
  const assigned = new Map<number, number>();
  for (const a of assignments) {
    if (!containers.some((c) => c.containerId === a.containerId)) {
      throw new Error(
        "Container " + a.containerId + " does not belong to this order."
      );
    }
    assigned.set(a.containerId, a.truckId);
  }

  // Every container must be assigned to a truck
  for (const c of containers) {
    if (!assigned.has(c.containerId)) {
      throw new Error(
        "Container " + c.containerNumber + " has no truck assigned."
      );
    }
  }

  const truckIds = [...new Set(assigned.values())];

  const trucks = await prisma.truck.findMany({
    where: { truckId: { in: truckIds } },
  });

  if (trucks.length !== truckIds.length) {
    throw new Error("One or more selected trucks were not found.");
  }

  // Accumulate assigned weight per truck and check availability + capacity
  const truckIndex = new Map(trucks.map((t) => [t.truckId, t]));
  const weightByTruck: Record<number, number> = {};

  for (const c of containers) {
    const tId = assigned.get(c.containerId)!;
    const truck = truckIndex.get(tId)!;

    if (truck.status !== "available") {
      throw new Error(
        "Truck " +
          truck.registration_number +
          " is not available (status: " +
          truck.status +
          ")."
      );
    }

    weightByTruck[tId] =
      (weightByTruck[tId] || 0) + Number(c.weightTonnes);
  }

  for (const t of trucks) {
    const maxCargo = maxCargoForTruck(t.capacity_tonnes);
    if (maxCargo == null) {
      throw new Error(
        "Truck " + t.registration_number + " has no declared capacity."
      );
    }

    const load = weightByTruck[t.truckId] || 0;
    if (maxCargo !== Infinity && load > maxCargo) {
      throw new Error(
        "Truck " +
          t.registration_number +
          " load (" +
          load.toFixed(2) +
          " t) exceeds its capacity (" +
          maxCargo +
          " t). Move some containers to another truck."
      );
    }
  }

  // One allocation row per distinct truck
  await prisma.allocation.createMany({
    data: truckIds.map((tid) => ({ orderId, truckId: tid })),
  });

  // Record which truck carries each container
  for (const c of containers) {
    await prisma.container.update({
      where: { containerId: c.containerId },
      data: { truckId: assigned.get(c.containerId)! },
    });
  }

  // Mark order allocated and selected trucks assigned
  await prisma.order.update({
    where: { orderId },
    data: { status: "allocated" },
  });

  await prisma.truck.updateMany({
    where: { truckId: { in: truckIds } },
    data: { status: "assigned" },
  });

  try {
    const firstTruck = truckIndex.get(truckIds[0]);
    await sendAllocationNotification({
      orderId: order.orderId,
      bolNumber: order.bolNumber ?? "N/A",
      customerName: order.customerName,
      truckRegistration: firstTruck
        ? firstTruck.registration_number
        : "",
      truckCapacity:
        firstTruck && firstTruck.capacity_tonnes
          ? String(firstTruck.capacity_tonnes)
          : null,
      // Include every truck assigned to this order so the email lists
      // them all (not just the first one).
      trucks: truckIds.map((tid) => {
        const t = truckIndex.get(tid);
        return {
          registration: t?.registration_number ?? "",
          capacity: t?.capacity_tonnes ? String(t.capacity_tonnes) : null,
        };
      }),
    });
  } catch (e) {
    console.warn(
      { err: e },
      "Allocation completed but notification email failed to send"
    );
  }

  return {
    orderId: order.orderId,
    containers: containers.map((c) => ({
      containerId: c.containerId,
      containerNumber: c.containerNumber,
      truckId: assigned.get(c.containerId)!,
    })),
    trucks: truckIds,
  };
}
