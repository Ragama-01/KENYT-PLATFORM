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

  app.get("/drivers", async (_request, reply) => {
    const drivers = await prisma.driver.findMany({
      include: { truck: { select: { registrationNumber: true } } },
      orderBy: { fullName: "asc" },
    });
    return reply.send(drivers);
  });
}
