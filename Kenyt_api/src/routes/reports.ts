import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

/**
 * Reporting routes.
 *
 * Each endpoint returns a flat, ready-to-render dataset so the frontend can
 * display it in a table and/or export it to CSV without further processing.
 */
export default async function reportRoutes(app: FastifyInstance) {
  /**
   * Orders grouped by customer: how many orders each customer has placed,
   * plus the total cargo tonnage they have shipped.
   */
  app.get("/reports/orders-by-customer", async (request, reply) => {
    try {
      const groups = await prisma.order.groupBy({
        by: ["customerName"],
        _count: { _all: true },
        _sum: { cargoWeightTonnes: true },
      });

      const rows = groups.map((g) => ({
        customer: g.customerName,
        orderCount: g._count._all,
        totalWeightTonnes: g._sum.cargoWeightTonnes?.toString() ?? "0",
      }));

      rows.sort((a, b) => b.orderCount - a.orderCount);

      return reply.send(rows);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "failed_to_build_report" });
    }
  });

  /**
   * Full driver details, including the truck they are currently assigned to.
   */
  app.get("/reports/drivers", async (request, reply) => {
    try {
      const drivers = await prisma.driver.findMany({
        include: {
          truck: { select: { registration_number: true, status: true } },
        },
        orderBy: { fullName: "asc" },
      });

      const rows = drivers.map((d) => ({
        driverId: d.driverId,
        fullName: d.fullName,
        idNumber: d.idNumber,
        phoneNumber: d.phoneNumber,
        email: d.email,
        kraPin: d.kraPin,
        kpaId: d.kpaId ?? "",
        nssfNumber: d.nssfNumber,
        shifNumber: d.shifNumber,
        dateOfJoining: d.dateOfJoining.toISOString().split("T")[0],
        status: d.status,
        truckRegistration: d.truck?.registration_number ?? "",
        truckStatus: d.truck?.status ?? "",
      }));

      return reply.send(rows);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "failed_to_build_report" });
    }
  });

  /**
   * High-level order summary: totals plus breakdowns by status, cargo type
   * and load type, so trends are easy to spot.
   */
  app.get("/reports/order-summary", async (request, reply) => {
    try {
      const orders = await prisma.order.findMany({
        select: {
          status: true,
          cargoType: true,
          loadType: true,
          cargoWeightTonnes: true,
          createdAt: true,
        },
      });

      const toBreakdown = (pick: (o: (typeof orders)[number]) => string) => {
        const counts: Record<string, number> = {};
        for (const o of orders) {
          const key = pick(o) || "unknown";
          counts[key] = (counts[key] ?? 0) + 1;
        }
        return Object.entries(counts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);
      };

      let totalWeightTonnes = 0;
      for (const o of orders) {
        totalWeightTonnes += Number(o.cargoWeightTonnes);
      }

      return reply.send({
        totalOrders: orders.length,
        totalWeightTonnes: Number(totalWeightTonnes.toFixed(2)),
        byStatus: toBreakdown((o) => o.status),
        byCargoType: toBreakdown((o) => o.cargoType),
        byLoadType: toBreakdown((o) => o.loadType),
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "failed_to_build_report" });
    }
  });

  /**
   * Fleet summary: every truck with its status plus a status breakdown and a
   * list of compliance items that have expired (or expire soon).
   */
  app.get("/reports/fleet-summary", async (request, reply) => {
    try {
      const trucks = await prisma.truck.findMany({
        include: {
          trailer: true,
          drivers: { select: { fullName: true } },
        },
        orderBy: { registration_number: "asc" },
      });

      const rows = trucks.map((t) => ({
        truckId: t.truckId,
        registration: t.registration_number,
        yearOfManufacture: t.year_of_manufacture,
        capacityTonnes: t.capacity_tonnes?.toString() ?? "0",
        status: t.status,
        assignedDriver: t.drivers[0]?.fullName ?? "",
        trailerRegistration: t.trailer?.registration_number ?? "",
      }));

      const byStatus: Record<string, number> = {};
      for (const t of trucks) {
        byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      }

      const today = new Date();
      const soonThreshold = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const complianceAlerts: {
        registration: string;
        item: string;
        expiryDate: string;
      }[] = [];

      for (const t of trucks) {
        const checks: { item: string; expiry: Date | null }[] = [
          { item: "insurance", expiry: t.truck_insurance_expiry },
          { item: "inspection", expiry: t.inspection_expiry },
          { item: "speed governor", expiry: t.speed_governor_expiry },
          { item: "COMESA", expiry: t.truck_comesa_date_expiry },
        ];

        for (const c of checks) {
          if (c.expiry && c.expiry <= soonThreshold) {
            complianceAlerts.push({
              registration: t.registration_number,
              item: c.item,
              expiryDate: c.expiry.toISOString().split("T")[0],
            });
          }
        }
      }

      complianceAlerts.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

      return reply.send({
        totalTrucks: trucks.length,
        byStatus: Object.entries(byStatus)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count),
        rows,
        complianceAlerts,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "failed_to_build_report" });
    }
  });
}