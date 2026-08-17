// Seeds / updates the pickup & delivery locations in the `locations` table.
// Idempotent: uses upsert keyed on the unique `name`, so it can be re-run.
//
// Run with:  npx tsx prisma/seedLocations.ts   (or `npm run prisma:seed-locations`)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedLocation {
  name: string;
  latitude: number;
  longitude: number;
  type: string;
}

const LOCATIONS: SeedLocation[] = [
  // Kampala / Uganda ICDs & depots
  { name: "Lexus ICD Uganda", latitude: -0.354162, longitude: 32.690677, type: "icd" },
  { name: "CEVA UG", latitude: 0.3298, longitude: 32.6205, type: "depot" },
  { name: "URA Uganda", latitude: 0.32941, longitude: 32.619764, type: "office" },

  // Western Uganda / border
  { name: "Kasese UG", latitude: 0.169899, longitude: 30.078078, type: "town" },
  { name: "Malaba UG", latitude: 0.638268, longitude: 34.264471, type: "border" },

  // Kenya coast (Mombasa)
  { name: "Mombasa Port", latitude: -4.058056, longitude: 39.681389, type: "port" },
  { name: "Mkindani Kenya", latitude: -4.004874, longitude: 39.6287, type: "town" },

  // Truck stops
  { name: "Petro City Bonje Kenya", latitude: -4.002682, longitude: 39.568695, type: "truck_stop" },
  { name: "Tairi Mbile Petro City Eldoret", latitude: 0.552104, longitude: 35.244471, type: "truck_stop" },
];

async function main() {
  console.log("🌍 Seeding pickup/delivery locations...");

  let created = 0;
  let updated = 0;

  for (const loc of LOCATIONS) {
    const existing = await prisma.location.findUnique({ where: { name: loc.name } });

    const result = await prisma.location.upsert({
      where: { name: loc.name },
      create: loc,
      update: {
        latitude: loc.latitude,
        longitude: loc.longitude,
        type: loc.type,
      },
    });

    if (existing) {
      updated++;
      console.log(`  ↔ ${loc.name} (id ${result.locationId})`);
    } else {
      created++;
      console.log(`  + ${loc.name} (id ${result.locationId})`);
    }
  }

  const total = await prisma.location.count();
  console.log(`✅ Done. Created ${created}, updated ${updated}. Total locations: ${total}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
