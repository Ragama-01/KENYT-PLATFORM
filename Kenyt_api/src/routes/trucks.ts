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

          status: "available",

          inspection_issued: new Date(v.inspection_issued),
          inspection_expiry: new Date(v.inspection_expiry),

          speed_governor_issued: new Date(v.speed_governor_issued),
          speed_governor_expiry: new Date(v.speed_governor_expiry),

          truck_insurance_issued: new Date(v.truck_insurance_issued),
          truck_insurance_expiry: new Date(v.truck_insurance_expiry),
          truck_insurance_ref: v.truck_insurance_ref || null,

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

          // Create the trailer record in the separate trailers table
          trailer: v.trailer
            ? {
                create: {
                  registration_number: v.trailer.registration_number,

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
        },
      });

      if (!truck) {
        return reply.status(404).send({
          error: "Truck not found",
        });
      }

      return reply.send({
        id: truck.truckId,
        ...truck,
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
      // Separate trailer data from truck data
      const { trailer, ...truckData } = v;

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
          ...(truckData.speed_governor_issued
            ? { speed_governor_issued: new Date(truckData.speed_governor_issued) }
            : {}),
          ...(truckData.speed_governor_expiry
            ? { speed_governor_expiry: new Date(truckData.speed_governor_expiry) }
            : {}),
          ...(truckData.truck_insurance_issued
            ? { truck_insurance_issued: new Date(truckData.truck_insurance_issued) }
            : {}),
          ...(truckData.truck_insurance_expiry
            ? { truck_insurance_expiry: new Date(truckData.truck_insurance_expiry) }
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
}