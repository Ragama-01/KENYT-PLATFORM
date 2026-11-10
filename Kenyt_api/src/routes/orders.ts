import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendOrderCreatedNotification } from "../services/email.service";

export default async function orderRoutes(app: FastifyInstance) {
  /**
   * Create Order
   */
  app.post("/orders", async (request: any, reply) => {
    const body = request.body;

    try {
      const rawContainers = Array.isArray(body.containers) ? body.containers : [];

      // Each container carries its own weight + contents. When none are given we
      // fall back to the legacy single-field format (weight_tonnes / cargo_type).
      const containers = rawContainers.map((c: any) => ({
        containerNumber: c.container_number ?? null,
        containerType: c.container_type || null,
        weightTonnes: Number(c.weight_tonnes),
        cargoType: c.cargo_type || "",
      }));

      // Validate each container's weight (0 < w <=  100 tonnes).
      for (const c of containers) {
        if (
          c.weightTonnes == null ||
          Number.isNaN(c.weightTonnes) ||
          c.weightTonnes <=  0 ||
          c.weightTonnes >  100
        ) {
          return reply.status(400).send({
            error: "invalid_weight",
            message:
              `Container ${c.containerNumber || "n/a"}: enter the weight in TONNES (e.g. 20,
 not 20000). Max per container is  100 tonnes.`,
          });
        }
      }

      // Total order weight = sum of all container weights (multiple trucks may be needed).
      const totalWeight =
        containers.length >  0
          ? containers.reduce(
              (sum: number, c: any) => sum + c.weightTonnes,
              0
            )
          : Number(body.weight_tonnes);

      if (
        containers.length ===  0&&
          (body.weight_tonnes == null ||
            Number.isNaN(totalWeight) ||
            totalWeight <=  0)
      ) {
        return reply.status(400).send({
          error: "invalid_weight",
          message:
            "Enter the cargo weight in TONNES (e.g. 20, not 20000), either per container or as a single total.",
        });
      }

      const cargoType =
        (body.cargo_type && String(body.cargo_type).trim()) ||
        (containers[0]?.cargoType || "");

      // Generate unique BOL number if not provided (PostgreSQL unique index doesn't allow multiple NULLs)
      const bolNumber = body.bol_number && String(body.bol_number).trim() !== ""
        ? String(body.bol_number).trim()
        : `BOL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const order = await prisma.order.create({
        data: {
          bolNumber,

          customerName: body.customer_name,

          cargoWeightTonnes: Number(totalWeight.toFixed(2)),

          cargoType,
          loadType: body.load_type,

          containerNumber: body.container_number || null,
          containerType: body.container_type || null,

          pickupLocation: {
            connect: {
              locationId: body.pickup_location_id,
            },
          },

          deliveryLocation: {
            connect: {
              locationId: body.delivery_location_id,
            },
          },

          consigneeName: body.consignee_name,
          consigneePhone: body.consignee_phone || null,

          freeStorageDays: body.free_storage_days ?? null,

          etaDischargeDate: body.eta_discharge_date
            ? new Date(body.eta_discharge_date)
            : null,

          documentationStatus: body.documentation_status || null,

          gfDoType: body.gf_do_type || null,
          gfDoDocument: body.gf_do_document || null,
          gfDoDocumentName: body.gf_do_document_name || null,

          im4Im7Type: body.im4_im7_type || null,
          im4Im7Document: body.im4_im7_document || null,
          im4Im7DocumentName: body.im4_im7_document_name || null,

          specialInstructions: body.special_instructions || null,

          containers: {
            create: containers.map((c: any) => ({
              containerNumber: c.containerNumber,
              containerType: c.containerType,
              weightTonnes: c.weightTonnes,
              cargoType: c.cargoType,
            })),
          },
        },
        include: {
          pickupLocation: true,
          deliveryLocation: true,
          containers: true,
        },
      });

      // Send email notification to the super user for allocation
      try {
        await sendOrderCreatedNotification({
          orderId: order.orderId,
          bolNumber: order.bolNumber ?? "N/A",
          customerName: order.customerName,
          cargoType: order.cargoType,
          weightTonnes: String(order.cargoWeightTonnes),
          loadType: order.loadType,
          pickup: order.pickupLocation?.name ?? "Unknown",
          delivery: order.deliveryLocation?.name ?? "Unknown",
          etaDischarge: order.etaDischargeDate
            ? order.etaDischargeDate.toISOString().split("T")[0]
            : null,
          specialInstructions: order.specialInstructions,
        });
      } catch (notifErr) {
        request.log.warn(
          { err: notifErr },
          "Order created but notification email failed to send"
        );
      }

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
      include: {
        pickupLocation: true,
        deliveryLocation: true,
        containers: true,
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
      include: {
        pickupLocation: true,
        deliveryLocation: true,
        containers: true,
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
   * Update order (documentation and core fields)
   */
  app.put("/orders/:id", async (request: any, reply) => {
    const body = request.body;
    const orderId = Number(request.params.id);
    try {
      const data: any = {};
      if (body.bol_number !== undefined) data.bolNumber = body.bol_number || null;
      if (body.customer_name !== undefined) data.customerName = body.customer_name;
      if (body.load_type !== undefined) data.loadType = body.load_type;
      if (body.consignee_name !== undefined) data.consigneeName = body.consignee_name;
      if (body.consignee_phone !== undefined) data.consigneePhone = body.consignee_phone || null;
      if (body.free_storage_days !== undefined) data.freeStorageDays = body.free_storage_days ?? null;
      if (body.eta_discharge_date !== undefined)
        data.etaDischargeDate = body.eta_discharge_date ? new Date(body.eta_discharge_date) : null;
      if (body.documentation_status !== undefined) data.documentationStatus = body.documentation_status || null;
      if (body.gf_do_type !== undefined) data.gfDoType = body.gf_do_type || null;
      if (body.gf_do_document !== undefined) data.gfDoDocument = body.gf_do_document || null;
      if (body.gf_do_document_name !== undefined) data.gfDoDocumentName = body.gf_do_document_name || null;
      if (body.im4_im7_type !== undefined) data.im4Im7Type = body.im4_im7_type || null;
      if (body.im4_im7_document !== undefined) data.im4Im7Document = body.im4_im7_document || null;
      if (body.im4_im7_document_name !== undefined) data.im4Im7DocumentName = body.im4_im7_document_name || null;
      if (body.special_instructions !== undefined) data.specialInstructions = body.special_instructions || null;
      if (body.pickup_location_id !== undefined) data.pickupLocationId = Number(body.pickup_location_id);
      if (body.delivery_location_id !== undefined) data.deliveryLocationId = Number(body.delivery_location_id);

      const order = await prisma.order.update({
        where: { orderId },
        data,
        include: {
          pickupLocation: true,
          deliveryLocation: true,
          containers: true,
        },
      });

      return reply.send({ id: order.orderId, ...order });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        error: "server_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
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