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
          trailer_registration: v.trailer_registration || null,

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

          trailer_insurance_issued:
            v.trailer_insurance_issued
              ? new Date(v.trailer_insurance_issued)
              : null,

          trailer_insurance_expiry:
            v.trailer_insurance_expiry
              ? new Date(v.trailer_insurance_expiry)
              : null,

          trailer_insurance_ref:
            v.trailer_insurance_ref || null,

          trailer_comesa_policy_number:
            v.trailer_comesa_policy_number || null,

          trailer_comesa_insurer:
            v.trailer_comesa_insurer || null,

          trailer_comesa_date_taken:
            v.trailer_comesa_date_taken
              ? new Date(v.trailer_comesa_date_taken)
              : null,

          trailer_comesa_date_expiry:
            v.trailer_comesa_date_expiry
              ? new Date(v.trailer_comesa_date_expiry)
              : null,

          trailer_comesa_premium_amount:
            v.trailer_comesa_premium_amount ?? null,
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

    try {
      const truck = await prisma.truck.update({
        where: {
          truckId: Number(request.params.id),
        },
        data: {
          ...v,
        },
      });

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