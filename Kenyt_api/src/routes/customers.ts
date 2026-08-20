import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

/**
 * Customer CRUD routes.
 *
 * The Prisma client returns camelCase fields (customerId, contactName, …),
 * which match the frontend's Customer type.
 */
export default async function customerRoutes(app: FastifyInstance) {
  /** Create Customer */
  app.post("/customers", async (request, reply) => {
    const { name, contactName, phone, email, address } = request.body as {
      name: string;
      contactName?: string;
      phone?: string;
      email?: string;
      address?: string;
    };

    if (!name || !name.trim()) {
      return reply.status(400).send({
        error: "validation_failed",
        message: "Customer name is required",
      });
    }

    try {
      const customer = await prisma.customer.create({
        data: {
          name: name.trim(),
          contactName: contactName?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
        },
      });

      return reply.status(201).send(customer);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return reply.status(409).send({
          error: "conflict",
          message: "A customer with this name already exists",
        });
      }
      throw err;
    }
  });

  /** Get all customers */
  app.get("/customers", async (_request, reply) => {
    try {
      const customers = await prisma.customer.findMany({
        orderBy: { name: "asc" },
      });
      return reply.send(customers);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      return reply.status(500).send({
        error: "failed_to_fetch_customers",
      });
    }
  });

  /** Get one customer */
  app.get("/customers/:id", async (request: any, reply) => {
    const id = Number(request.params.id);

    try {
      const customer = await prisma.customer.findUnique({
        where: { customerId: id },
      });

      if (!customer) {
        return reply.status(404).send({ error: "customer_not_found" });
      }

      return reply.send(customer);
    } catch (err) {
      console.error("Failed to fetch customer:", err);
      return reply.status(500).send({ error: "failed_to_fetch_customer" });
    }
  });

  /** Update customer */
  app.put("/customers/:id", async (request: any, reply) => {
    const id = Number(request.params.id);
    const { name, contactName, phone, email, address } = request.body as any;

    try {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (contactName !== undefined)
        updateData.contactName = contactName?.trim() || null;
      if (phone !== undefined) updateData.phone = phone?.trim() || null;
      if (email !== undefined) updateData.email = email?.trim() || null;
      if (address !== undefined) updateData.address = address?.trim() || null;

      const customer = await prisma.customer.update({
        where: { customerId: id },
        data: updateData,
      });

      return reply.send(customer);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return reply.status(409).send({
          error: "conflict",
          message: "A customer with this name already exists",
        });
      }
      console.error("Failed to update customer:", err);
      return reply.status(500).send({ error: "failed_to_update_customer" });
    }
  });

  /** Delete customer */
  app.delete("/customers/:id", async (request: any, reply) => {
    const id = Number(request.params.id);

    try {
      await prisma.customer.delete({ where: { customerId: id } });
      return reply.status(204).send();
    } catch (err) {
      console.error("Failed to delete customer:", err);
      return reply.status(500).send({ error: "failed_to_delete_customer" });
    }
  });
}