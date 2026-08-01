

import { chromium, Page } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ScrapedPosition {
  registrationNumber: string; // used to match back to your trucks table
  lat: number;
  lng: number;
}

async function scrapeControlTech(): Promise<ScrapedPosition[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(process.env.CONTROLTECH_URL!);

    // --- Login ---
    
   async function loginToControlTech(page: Page): Promise<void> {
  await page.goto(process.env.CONTROLTECH_URL!);
  await page.fill('input#user', process.env.CONTROLTECH_USERNAME!);
  await page.fill('input#passw', process.env.CONTROLTECH_PASSWORD!);
  await page.click('input#submit');
  await page.waitForLoadState("networkidle");
}

    // Wait for the dashboard to load after login
    await page.waitForLoadState("networkidle");

    // --- Navigate to wherever the live position list/map lives ---
    // TODO: adjust the URL or add a click-through if positions aren't
    // on the landing page after login
    // await page.goto(`${process.env.CONTROLTECH_URL}/live-positions`);

    // --- Extract positions ---
    // TODO: this is a guess at a typical table-row structure — inspect
    // the real page and rewrite this evaluate() block to match it.
    const positions: ScrapedPosition[] = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".vehicle-row"));
      return rows
        .map((row) => {
          const reg = row.querySelector(".vehicle-reg")?.textContent?.trim();
          const lat = row.getAttribute("data-lat");
          const lng = row.getAttribute("data-lng");
          if (!reg || !lat || !lng) return null;
          return {
            registrationNumber: reg,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
          };
        })
        .filter((p): p is ScrapedPosition => p !== null);
    });

    return positions;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("Scraping Control-Tech dashboard...");
  const positions = await scrapeControlTech();
  console.log(`Got ${positions.length} truck positions`);

  const now = new Date();

  for (const pos of positions) {
    const truck = await prisma.truck.findFirst({
      where: { registration_number: pos.registrationNumber },
    });

    if (!truck) {
      console.warn(`No matching truck for registration ${pos.registrationNumber} — skipping`);
      continue;
    }

    await prisma.truckLocation.upsert({
      where: { truckId: truck.truckId },
      create: {
        truckId: truck.truckId,
        lat: pos.lat,
        lng: pos.lng,
        asOf: now,
      },
      update: {
        lat: pos.lat,
        lng: pos.lng,
        asOf: now,
      },
    });
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
