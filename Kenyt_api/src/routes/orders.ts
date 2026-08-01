import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export default async function orderRoutes(app: FastifyInstance) {
  /**
   * Create Order
   */
  app.post("/orders", async (request: any, reply) => {
    const body = request.body;

    try {
      const order = await prisma.order.create({
  data: {
    bolNumber: body.bol_number,

    customerName: body.customer_name,

    cargoWeightTonnes: body.weight_tonnes,

    cargoType: body.cargo_type,

    loadType: body.load_type,

    containerNumber: body.container_number || null,
    containerType: body.container_type || null,

    pickupLocation: {
    connect: {
        locationId: body.pickup_location_id
    }
},

deliveryLocation: {
    connect: {
        locationId: body.delivery_location_id
    }
},

    consigneeName: body.consignee_name,
    consigneePhone: body.consignee_phone || null,

    freeStorageDays: body.free_storage_days ?? null,

    specialInstructions: body.special_instructions || null,
  },
});

      return reply.status(201).send({
        id: order.orderId,
        ...order,
      });
    } catch (err) {
  console.error(err);

  request.log.error(err);

  return reply.status(500).send({
    error: "server_error",
    message: err instanceof Error ? err.message : String(err),
  });
}
  });

  /**
   * Get all orders
   */
  app.get("/orders", async (_request, reply) => {
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return reply.send(
      orders.map((order) => ({
        id: order.orderId,
        ...order,
      }))
    );
  });

  /**
   * Get one order
   */
  app.get("/orders/:id", async (request: any, reply) => {
    const order = await prisma.order.findUnique({
      where: {
        orderId: Number(request.params.id),
      },
    });

    if (!order) {
      return reply.status(404).send({
        error: "Order not found",
      });
    }

    return reply.send({
      id: order.orderId,
      ...order,
    });
  });

  /**
   * Delete order
   */
  app.delete("/orders/:id", async (request: any, reply) => {
    await prisma.order.delete({
      where: {
        orderId: Number(request.params.id),
      },
    });

    return reply.status(204).send();
  });
}