import { prisma } from "../lib/prisma";
import { maxCargoForTruck } from "../utils/capacity";
import { recommendTruck } from "../services/recommendation.service";

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { orderId: "asc" },
    include: { pickupLocation: true },
  });

  const trucks = await prisma.truck.findMany({
    include: { location: true },
  });

  console.log("=== ORDERS ===");
  for (const o of orders) {
    console.log(
      `order #${o.orderId} | weight=${o.cargoWeightTonnes}t | pickup=${o.pickupLocation.name} | status=${o.status}`
    );
  }

  console.log("\n=== TRUCKS ===");
  for (const t of trucks) {
    console.log(
      `#${t.truckId} ${t.registration_number} | cap=${t.capacity_tonnes}t | maxCargo=${maxCargoForTruck(t.capacity_tonnes)} | status=${t.status} | hasLoc=${!!t.location}${t.location ? ` (${t.location.lat},${t.location.lng})` : ""}`
    );
  }

  const available = trucks.filter(
    (t) => t.status === "available" && !!t.location
  );
  console.log(`\nAvailable + have GPS location: ${available.length}`);

  console.log("\n=== recommendTruck() live test ===");
  for (const o of orders) {
    try {
      const rec = await recommendTruck(o.orderId);
      console.log(
        `order #${o.orderId}: SUCCESS -> ${rec.trucks.length} candidate(s); nearest ${rec.trucks[0]?.registration} (${rec.trucks[0]?.distanceKm} km)`
      );
    } catch (e) {
      console.log(`order #${o.orderId}: FAILED -> ${(e as Error).message}`);
    }
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
