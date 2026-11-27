import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { driverRegistrationSchema } from "../lib/validation";

export default async function driverRoutes(app: FastifyInstance) {
  app.post("/drivers", async (request, reply) => {
    const parsed = driverRegistrationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }
    const v = parsed.data;

    try {
      const driver = await prisma.driver.create({
        data: {
          fullName: v.full_name,
          idNumber: v.id_number,
          truckId: v.truck_id ?? null,
          dateOfJoining: new Date(v.date_of_joining),
          kraPin: v.kra_pin,
          kpaId: v.kpa_id || null,
          kpaIdExpiry: v.kpa_id_expiry ? new Date(v.kpa_id_expiry) : null,
          phoneNumber: v.phone_number,
          alternativePhoneNumber: v.alternative_phone_number || null,
          email: v.email,
          nssfNumber: v.nssf_number,
          shifNumber: v.shif_number,
          certificateOfGoodConduct: v.certificate_of_good_conduct || null,
        },
      });

      return reply.status(201).send({ driver_id: driver.driverId, full_name: driver.fullName });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.status(409).send({ error: "duplicate", message: "ID number already registered" });
      }
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  app.get("/drivers", async (request: any, reply) => {
    const archived = request.query?.archived;
    const where: any = {};
    if (archived === "true") where.archivedAt = { not: null };
    else if (archived !== "all") where.archivedAt = null;

    const drivers = await prisma.driver.findMany({
      where,
      include: { truck: { select: { registration_number: true, truckId: true } } },
      orderBy: { fullName: "asc" },
    });
    return reply.send(drivers);
  });

  // Archive a driver (soft delete)
  app.post("/drivers/:id/archive", async (request: any, reply) => {
    const driverId = Number(request.params.id);
    const { reason, dateOfLeaving, note, confirmUnassign } = request.body || {};

    try {
      const driver = await prisma.driver.findUnique({
        where: { driverId },
        include: { truck: { include: { allocations: true } } },
      });

      if (!driver) return reply.status(404).send({ error: "Driver not found" });

      // Block if on active trip/load
      const activeAlloc = driver.truck?.allocations?.some((a: any) => !a.arrivedAt);
      if (activeAlloc) {
        return reply.status(409).send({
          error: "active_trip",
          message: "Cannot archive a driver on an active trip or load. Complete or reassign first.",
        });
      }

      // Unassign truck if assigned
      if (driver.truckId) {
        if (!confirmUnassign) {
          return reply.status(409).send({
            error: "confirm_unassign",
            message: `This will unassign ${driver.truck?.registration_number}.`,
            truckRegistration: driver.truck?.registration_number,
          });
        }
        await prisma.driver.update({ where: { driverId }, data: { truckId: null } });
      }

      const user = (request as any).user;
      const archivedBy = user?.email || user?.fullName || "unknown";

      await prisma.driver.update({
        where: { driverId },
        data: {
          archivedAt: new Date(),
          archivedBy,
          archiveReason: reason || null,
          archiveNote: note || null,
        },
      });

      return reply.send({ message: "Driver archived" });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  // Restore a driver (as Unassigned)
  app.post("/drivers/:id/restore", async (request: any, reply) => {
    const driverId = Number(request.params.id);
    try {
      await prisma.driver.update({
        where: { driverId },
        data: {
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
          archiveNote: null,
          truckId: null,
        },
      });
      return reply.send({ message: "Driver restored" });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  // Bulk archive
  app.post("/drivers/bulk/archive", async (request: any, reply) => {
    const { ids, reason, dateOfLeaving, note } = request.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ error: "ids required" });
    }
    const user = (request as any).user;
    const archivedBy = user?.email || user?.fullName || "unknown";

    const drivers = await prisma.driver.findMany({
      where: { driverId: { in: ids.map(Number) } },
      include: { truck: { include: { allocations: true } } },
    });
    const archivable = drivers.filter((d: any) => {
      const activeAlloc = d.truck?.allocations?.some((a: any) => !a.arrivedAt);
      return !activeAlloc;
    });
    const skipped = drivers.length - archivable.length;

    // Unassign trucks
    for (const d of archivable) {
      if (d.truckId) {
        await prisma.driver.update({ where: { driverId: d.driverId }, data: { truckId: null } });
      }
    }

    await prisma.driver.updateMany({
      where: { driverId: { in: archivable.map((d: any) => d.driverId) } },
      data: {
        archivedAt: new Date(),
        archivedBy,
        archiveReason: reason || null,
        archiveNote: note || null,
      },
    });

    return reply.send({ archived: archivable.length, skipped, message: `${archivable.length} archived, ${skipped} skipped.` });
  });

  // Bulk restore
  app.post("/drivers/bulk/restore", async (request: any, reply) => {
    const { ids } = request.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ error: "ids required" });
    }
    await prisma.driver.updateMany({
      where: { driverId: { in: ids.map(Number) } },
      data: {
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        archiveNote: null,
        truckId: null,
      },
    });
    return reply.send({ restored: ids.length });
  });
}
