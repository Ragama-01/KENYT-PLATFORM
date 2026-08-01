import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { loginToWialon, fetchAllUnitPositions } from "./wialonClient.js";

// Unit names look like "KENYT - KDR 390R" -- strip any leading label and
// all whitespace so "KDR 390R" matches a registration_number of "KDR390R"
// or "KDR 390R", whichever format your trucks table uses.
function normalize(reg: string): string {
  return reg.replace(/^KENYT\s*-\s*/i, "").replace(/\s+/g, "").toUpperCase();
}

async function main() {
  console.log("[map] Logging in...");
  const sid = await loginToWialon(process.env.WIALON_LOGIN!, process.env.WIALON_PASSWORD!);

  console.log("[map] Fetching units...");
  const positions = await fetchAllUnitPositions(sid);

  const trucks = await prisma.truck.findMany({
    select: { truckId: true, registration_number: true, controlTechUnitId: true },
  });

  const trucksByNormalizedReg = new Map(trucks.map((t) => [normalize(t.registration_number), t]));

  let matched = 0;
  const unmatched: string[] = [];

  for (const p of positions) {
    const key = normalize(p.name);
    const truck = trucksByNormalizedReg.get(key);

    if (!truck) {
      unmatched.push(`${p.name} (unit ${p.controlTechUnitId})`);
      continue;
    }

    if (truck.controlTechUnitId === p.controlTechUnitId) {
      continue; // already mapped correctly
    }

    await prisma.truck.update({
      where: { truckId: truck.truckId },
      data: { controlTechUnitId: p.controlTechUnitId },
    });

    console.log(`[map] ${p.name} -> truckId ${truck.truckId} (unit ${p.controlTechUnitId})`);
    matched++;
  }

  console.log(`\n[map] Done. Mapped ${matched} truck(s).`);
  if (unmatched.length > 0) {
    console.log(`[map] Could not match ${unmatched.length} unit(s) to a truck by registration_number:`);
    unmatched.forEach((u) => console.log(`  - ${u}`));
    console.log(
      "[map] Check these manually -- likely a registration_number typo/format mismatch, or a truck not yet registered in your system."
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[map] Failed:", err.message);
  process.exit(1);
});