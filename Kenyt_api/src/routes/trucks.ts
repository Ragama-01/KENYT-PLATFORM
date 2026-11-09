import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

import {
  truckRegistrationSchema,
  truckUpdateSchema,
} from "../lib/validation";

export default async function truckRoutes(app: FastifyInstance) {
  /**
   * Register Truck
   */
  app.post("/trucks", async (request, reply) => {
    const parsed = truckRegistrationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "validation_failed",
        details: parsed.error.flatten(),
      });
    }

    const v = parsed.data;

    try {
      const truck = await prisma.truck.create({
        data: {
          registration_number: v.registration_number.toUpperCase(),
          year_of_manufacture: v.year_of_manufacture,
          capacity_tonnes: v.capacity_tonnes,
          controlTechUnitId: v.controlTechUnitId ?? undefined,
          logbook_number: v.logbook_number || null,

          status: "available",

          // Truck insurance
          truck_insurance_issued: new Date(v.truck_insurance_issued),
          truck_insurance_expiry: new Date(v.truck_insurance_expiry),
          truck_insurance_ref: v.truck_insurance_ref || null,
          truck_insurance_serial: v.truck_insurance_serial || null,
          truck_insurance_purchase: v.truck_insurance_purchase
            ? new Date(v.truck_insurance_purchase)
            : null,

          // TGL
          tgl_number: v.tgl_number || null,
          tgl_year: v.tgl_year || null,

          // Inspection
          inspection_issued: new Date(v.inspection_issued),
          inspection_expiry: new Date(v.inspection_expiry),
          inspection_cert_number: v.inspection_cert_number || null,

          // Speed governor
          speed_governor_issued: new Date(v.speed_governor_issued),
          speed_governor_expiry: new Date(v.speed_governor_expiry),

          // COMESA
          truck_comesa_policy_number:
            v.truck_comesa_policy_number,
          truck_comesa_insurer:
            v.truck_comesa_insurer,
          truck_comesa_date_taken:
            new Date(v.truck_comesa_date_taken),
          truck_comesa_date_expiry:
            new Date(v.truck_comesa_date_expiry),
          truck_comesa_premium_amount:
            v.truck_comesa_premium_amount,

          // Notes
          factors_to_note: v.factors_to_note || null,

          // Create the trailer record in the separate trailers table
          trailer: v.trailer
            ? {
                create: {
                  registration_number: v.trailer.registration_number,
                  logbook_number: v.trailer.logbook_number || null,

                  insurance_issued: v.trailer.insurance_issued
                    ? new Date(v.trailer.insurance_issued)
                    : null,
                  insurance_expiry: v.trailer.insurance_expiry
                    ? new Date(v.trailer.insurance_expiry)
                    : null,
                  insurance_ref: v.trailer.insurance_ref || null,

                  comesa_policy_number:
                    v.trailer.comesa_policy_number || null,
                  comesa_insurer:
                    v.trailer.comesa_insurer || null,
                  comesa_date_taken: v.trailer.comesa_date_taken
                    ? new Date(v.trailer.comesa_date_taken)
                    : null,
                  comesa_date_expiry: v.trailer.comesa_date_expiry
                    ? new Date(v.trailer.comesa_date_expiry)
                    : null,
                  comesa_premium_amount:
                    v.trailer.comesa_premium_amount ?? null,
                },
              }
            : undefined,
        },
        include: {
          trailer: true,
        },
      });

      return reply.status(201).send({
        id: truck.truckId,
        ...truck,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return reply.status(409).send({
          error: "duplicate",
          message: "Registration number already exists",
        });
      }

      request.log.error(err);

      return reply.status(500).send({
        error: "server_error",
      });
    }
  });

  /**
   * List all trucks
   */
  app.get("/trucks", async (request, reply) => {
    try {
      const trucks = await prisma.truck.findMany({
        orderBy: {
          registration_number: "asc",
        },
        include: {
          trailer: true,
        },
      });

      return reply.send(
        trucks.map((truck) => ({
          id: truck.truckId,
          ...truck,
        }))
      );
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        error: "server_error",
      });
    }
  });

  /**
   * Get one truck
   */
  app.get("/trucks/:id", async (request: any, reply) => {
    try {
      const truck = await prisma.truck.findUnique({
        where: {
          truckId: Number(request.params.id),
        },
        include: {
          trailer: true,
          insuranceHistory: {
            orderBy: { createdAt: "desc" },
          },
          tglHistory: {
            orderBy: { createdAt: "desc" },
          },
          inspectionHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!truck) {
        return reply.status(404).send({
          error: "Truck not found",
        });
      }

      // Also fetch trailer history if trailer exists
      let trailerInsuranceHistory: any[] = [];
      let trailerCOMESAHistory: any[] = [];
      if (truck.trailer?.trailerId) {
        trailerInsuranceHistory = await prisma.trailerInsuranceHistory.findMany({
          where: { trailerId: truck.trailer.trailerId },
          orderBy: { createdAt: "desc" },
        });
        trailerCOMESAHistory = await prisma.trailerCOMESAHistory.findMany({
          where: { trailerId: truck.trailer.trailerId },
          orderBy: { createdAt: "desc" },
        });
      }

      return reply.send({
        id: truck.truckId,
        ...truck,
        trailerInsuranceHistory,
        trailerCOMESAHistory,
      });
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        error: "server_error",
      });
    }
  });

  /**
   * Update truck
   */
  app.put("/trucks/:id", async (request: any, reply) => {
    const parsed = truckUpdateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "validation_failed",
        details: parsed.error.flatten(),
      });
    }

    const v = parsed.data;
    const truckId = Number(request.params.id);

    try {
      // Fetch current truck to compare fields for history
      const currentTruck = await prisma.truck.findUnique({
        where: { truckId },
        include: { trailer: true },
      });

      if (!currentTruck) {
        return reply.status(404).send({ error: "Truck not found" });
      }

      // Separate trailer data from truck data
      const { trailer, ...truckData } = v;

      // Create history records for truck insurance if changed
      if (truckData.truck_insurance_issued || truckData.truck_insurance_expiry || truckData.truck_insurance_ref || truckData.truck_insurance_serial || truckData.truck_insurance_purchase) {
        await prisma.truckInsuranceHistory.create({
          data: {
            truckId: truckId,
            policyNumber: truckData.truck_insurance_ref || currentTruck.truck_insurance_ref,
            serialNumber: truckData.truck_insurance_serial || currentTruck.truck_insurance_serial,
            insurer: currentTruck.truck_comesa_insurer, // Using COMESA insurer as fallback
            issuedDate: truckData.truck_insurance_issued ? new Date(truckData.truck_insurance_issued) : currentTruck.truck_insurance_issued!,
            expiryDate: truckData.truck_insurance_expiry ? new Date(truckData.truck_insurance_expiry) : currentTruck.truck_insurance_expiry!,
            purchaseDate: truckData.truck_insurance_purchase ? new Date(truckData.truck_insurance_purchase) : currentTruck.truck_insurance_purchase,
          },
        });
      }

      // Create history record for TGL if changed
      if (truckData.tgl_number !== undefined || truckData.tgl_year !== undefined) {
        await prisma.truckTGLHistory.create({
          data: {
            truckId: truckId,
            tglNumber: truckData.tgl_number ?? currentTruck.tgl_number,
            tglYear: truckData.tgl_year ?? currentTruck.tgl_year,
          },
        });
      }

      // Create history record for inspection if changed
      if (truckData.inspection_issued || truckData.inspection_expiry || truckData.inspection_cert_number) {
        await prisma.truckInspectionHistory.create({
          data: {
            truckId: truckId,
            certNumber: truckData.inspection_cert_number ?? currentTruck.inspection_cert_number,
            inspectionBody: undefined, // Not tracked currently
            issuedDate: truckData.inspection_issued ? new Date(truckData.inspection_issued) : currentTruck.inspection_issued!,
            expiryDate: truckData.inspection_expiry ? new Date(truckData.inspection_expiry) : currentTruck.inspection_expiry!,
          },
        });
      }

      // Handle trailer history if trailer exists and trailer data changed
      if (trailer && currentTruck.trailer) {
        const trailerId = currentTruck.trailer.trailerId;

        // Create trailer insurance history if changed
        if (trailer.insurance_issued !== undefined || trailer.insurance_expiry !== undefined || trailer.insurance_ref !== undefined) {
          await prisma.trailerInsuranceHistory.create({
            data: {
              trailerId,
              policyNumber: trailer.insurance_ref ?? currentTruck.trailer.insurance_ref,
              insurer: currentTruck.trailer.comesa_insurer, // Using COMESA insurer as fallback
              issuedDate: trailer.insurance_issued ? new Date(trailer.insurance_issued) : currentTruck.trailer.insurance_issued!,
              expiryDate: trailer.insurance_expiry ? new Date(trailer.insurance_expiry) : currentTruck.trailer.insurance_expiry!,
            },
          });
        }

        // Create trailer COMESA history if changed
        if (trailer.comesa_policy_number !== undefined || trailer.comesa_insurer !== undefined || trailer.comesa_date_taken !== undefined || trailer.comesa_date_expiry !== undefined || trailer.comesa_premium_amount !== undefined) {
          await prisma.trailerCOMESAHistory.create({
            data: {
              trailerId,
              policyNumber: trailer.comesa_policy_number ?? currentTruck.trailer.comesa_policy_number,
              insurer: trailer.comesa_insurer ?? currentTruck.trailer.comesa_insurer,
              dateTaken: trailer.comesa_date_taken ? new Date(trailer.comesa_date_taken) : currentTruck.trailer.comesa_date_taken,
              dateExpiry: trailer.comesa_date_expiry ? new Date(trailer.comesa_date_expiry) : currentTruck.trailer.comesa_date_expiry,
              premiumAmount: trailer.comesa_premium_amount ?? currentTruck.trailer.comesa_premium_amount,
            },
          });
        }
      }

      // Update the truck record
      const truck = await prisma.truck.update({
        where: {
          truckId,
        },
        data: {
          ...truckData,
          // Convert date strings to Date objects for truck fields
          ...(truckData.inspection_issued
            ? { inspection_issued: new Date(truckData.inspection_issued) }
            : {}),
          ...(truckData.inspection_expiry
            ? { inspection_expiry: new Date(truckData.inspection_expiry) }
            : {}),
          ...(truckData.inspection_cert_number != null
            ? { inspection_cert_number: truckData.inspection_cert_number }
            : {}),
          ...(truckData.speed_governor_issued
            ? { speed_governor_issued: new Date(truckData.speed_governor_issued) }
            : {}),
          ...(truckData.speed_governor_expiry
            ? { speed_governor_expiry: new Date(truckData.speed_governor_expiry) }
            : {}),
          ...(truckData.logbook_number != null
            ? { logbook_number: truckData.logbook_number }
            : {}),
          ...(truckData.truck_insurance_issued
            ? { truck_insurance_issued: new Date(truckData.truck_insurance_issued) }
            : {}),
          ...(truckData.truck_insurance_expiry
            ? { truck_insurance_expiry: new Date(truckData.truck_insurance_expiry) }
            : {}),
          ...(truckData.truck_insurance_serial != null
            ? { truck_insurance_serial: truckData.truck_insurance_serial }
            : {}),
          ...(truckData.truck_insurance_purchase != null
            ? { truck_insurance_purchase: new Date(truckData.truck_insurance_purchase) }
            : {}),
          ...(truckData.tgl_number != null
            ? { tgl_number: truckData.tgl_number }
            : {}),
          ...(truckData.tgl_year != null
            ? { tgl_year: truckData.tgl_year }
            : {}),
          ...(truckData.factors_to_note != null
            ? { factors_to_note: truckData.factors_to_note }
            : {}),
          ...(truckData.truck_comesa_date_taken
            ? { truck_comesa_date_taken: new Date(truckData.truck_comesa_date_taken) }
            : {}),
          ...(truckData.truck_comesa_date_expiry
            ? { truck_comesa_date_expiry: new Date(truckData.truck_comesa_date_expiry) }
            : {}),
        },
        include: {
          trailer: true,
        },
      });

      // Handle trailer upsert (create if not exists, update if exists)
      if (trailer) {
        await prisma.trailer.upsert({
          where: {
            truckId,
          },
          create: {
            truckId,
            registration_number: trailer.registration_number,
            logbook_number: trailer.logbook_number || null,
            insurance_issued: trailer.insurance_issued
              ? new Date(trailer.insurance_issued)
              : null,
            insurance_expiry: trailer.insurance_expiry
              ? new Date(trailer.insurance_expiry)
              : null,
            insurance_ref: trailer.insurance_ref || null,
            comesa_policy_number: trailer.comesa_policy_number || null,
            comesa_insurer: trailer.comesa_insurer || null,
            comesa_date_taken: trailer.comesa_date_taken
              ? new Date(trailer.comesa_date_taken)
              : null,
            comesa_date_expiry: trailer.comesa_date_expiry
              ? new Date(trailer.comesa_date_expiry)
              : null,
            comesa_premium_amount: trailer.comesa_premium_amount ?? null,
          },
          update: {
            registration_number: trailer.registration_number,
            logbook_number: trailer.logbook_number || null,
            insurance_issued: trailer.insurance_issued
              ? new Date(trailer.insurance_issued)
              : null,
            insurance_expiry: trailer.insurance_expiry
              ? new Date(trailer.insurance_expiry)
              : null,
            insurance_ref: trailer.insurance_ref || null,
            comesa_policy_number: trailer.comesa_policy_number || null,
            comesa_insurer: trailer.comesa_insurer || null,
            comesa_date_taken: trailer.comesa_date_taken
              ? new Date(trailer.comesa_date_taken)
              : null,
            comesa_date_expiry: trailer.comesa_date_expiry
              ? new Date(trailer.comesa_date_expiry)
              : null,
            comesa_premium_amount: trailer.comesa_premium_amount ?? null,
          },
        });
      }

      // Re-fetch with trailer to return the complete record
      const updatedTruck = await prisma.truck.findUnique({
        where: { truckId },
        include: { trailer: true },
      });

      return reply.send({
        id: updatedTruck?.truckId,
        ...updatedTruck,
      });
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        error: "server_error",
      });
    }
  });

  /**
   * Delete truck
   */
  app.delete("/trucks/:id", async (request: any, reply) => {
    try {
      await prisma.truck.delete({
        where: {
          truckId: Number(request.params.id),
        },
      });

      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        error: "server_error",
      });
    }
  });

  /**
   * Get truck insurance history
   */
  app.get("/trucks/:id/insurance-history", async (request: any, reply) => {
    try {
      const history = await prisma.truckInsuranceHistory.findMany({
        where: { truckId: Number(request.params.id) },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  /**
   * Get truck TGL history
   */
  app.get("/trucks/:id/tgl-history", async (request: any, reply) => {
    try {
      const history = await prisma.truckTGLHistory.findMany({
        where: { truckId: Number(request.params.id) },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  /**
   * Get truck inspection history
   */
  app.get("/trucks/:id/inspection-history", async (request: any, reply) => {
    try {
      const history = await prisma.truckInspectionHistory.findMany({
        where: { truckId: Number(request.params.id) },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  /**
   * Get trailer insurance history
   */
  app.get("/trucks/:id/trailer/insurance-history", async (request: any, reply) => {
    try {
      const truck = await prisma.truck.findUnique({
        where: { truckId: Number(request.params.id) },
        select: { trailer: { select: { trailerId: true } } },
      });
      if (!truck?.trailer?.trailerId) {
        return reply.send([]);
      }
      const history = await prisma.trailerInsuranceHistory.findMany({
        where: { trailerId: truck.trailer.trailerId },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  /**
   * Get trailer COMESA history
   */
  app.get("/trucks/:id/trailer/comesa-history", async (request: any, reply) => {
    try {
      const truck = await prisma.truck.findUnique({
        where: { truckId: Number(request.params.id) },
        select: { trailer: { select: { trailerId: true } } },
      });
      if (!truck?.trailer?.trailerId) {
        return reply.send([]);
      }
      const history = await prisma.trailerCOMESAHistory.findMany({
        where: { trailerId: truck.trailer.trailerId },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });
}