import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { findBestTruck } from "../services/allocationService";
import { recommendTruck } from "../services/recommendation.service";

export default async function allocationRoutes(app: FastifyInstance) {

  /**
   * Automatically allocate the best truck
   */
  app.post("/allocations", async (request: any, reply) => {
    try {
      const { orderId, truckId } = request.body;

      const result = await findBestTruck(orderId, truckId);

      return reply.send(result);

    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        error: err instanceof Error ? err.message : "server_error",
      });
    }
  });

  /**
   * Preview the recommended truck
   * (This only recommends — it does NOT allocate.)
   */
  app.get("/allocations/suggest/:orderId", async (request: any, reply) => {
    try {
      const orderId = Number(request.params.orderId);

      const result = await recommendTruck(orderId);

      return reply.send(result);

    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        error: err instanceof Error ? err.message : "server_error",
      });
    }
  });

  /**
   * List allocations
   */
  app.get("/allocations", async (_request, reply) => {

    const allocations = await prisma.allocation.findMany({
      include: {
        truck: true,
        order: true,
      },
      orderBy: {
        allocatedAt: "desc",
      },
    });

    return reply.send(allocations);

  });

}