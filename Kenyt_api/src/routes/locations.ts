import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export default async function locationRoutes(app: FastifyInstance) {

  /**
   * GET ALL LOCATIONS
   */
  app.get("/locations", async (_request, reply) => {

    try {

      const locations = await prisma.location.findMany({
        orderBy: {
          name: "asc"
        }
      });

      return reply.send(locations);

    } catch (err) {

      console.error(err);

      return reply.status(500).send({
        error: "server_error"
      });

    }

  });

  /**
   * GET SINGLE LOCATION
   */
  app.get("/locations/:id", async (request: any, reply) => {

    try {

      const location = await prisma.location.findUnique({

        where: {
          locationId: Number(request.params.id)
        }

      });

      if (!location) {

        return reply.status(404).send({
          error: "Location not found"
        });

      }

      return reply.send(location);

    } catch (err) {

      console.error(err);

      return reply.status(500).send({
        error: "server_error"
      });

    }

  });

}