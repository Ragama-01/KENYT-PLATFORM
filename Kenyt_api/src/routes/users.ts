import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

export default async function userRoutes(app: FastifyInstance) {
  app.post("/users", async (request, reply) => {
    const { email, password, fullName, role } = request.body as {
      email: string;
      password: string;
      fullName: string;
      role?: string;
    };

    if (!email || !password || !fullName) {
      return reply.status(400).send({
        error: "validation_failed",
        message: "Email, password, and full name are required",
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          fullName: fullName.trim(),
          role: role === "super_admin" ? "super_admin" : role === "admin" ? "admin" : "user",
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.status(201).send(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.status(409).send({
          error: "conflict",
          message: "A user with this email already exists",
        });
      }
      throw err;
    }
  });

  app.get("/users", async (_request, reply) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send(users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      return reply.status(500).send({ error: "failed_to_fetch_users" });
    }
  });

  app.get("/users/:id", async (request, reply) => {
    const id = Number(request.params.id);

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: "user_not_found" });
      }

      return reply.send(user);
    } catch (err) {
      console.error("Failed to fetch user:", err);
      return reply.status(500).send({ error: "failed_to_fetch_user" });
    }
  });

  app.put("/users/:id", async (request, reply) => {
    const id = Number(request.params.id);
    const { email, password, fullName, role, isActive } = request.body as any;

    try {
      const updateData: any = {};

      if (email !== undefined) updateData.email = email.toLowerCase().trim();
      if (fullName !== undefined) updateData.fullName = fullName.trim();
      if (role !== undefined) updateData.role = role === "super_admin" ? "super_admin" : role === "admin" ? "admin" : "user";
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password !== undefined) updateData.password = await bcrypt.hash(password, 10);

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.send(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.status(409).send({
          error: "conflict",
          message: "A user with this email already exists",
        });
      }
      console.error("Failed to update user:", err);
      return reply.status(500).send({ error: "failed_to_update_user" });
    }
  });

  app.delete("/users/:id", async (request, reply) => {
    const id = Number(request.params.id);

    try {
      await prisma.user.delete({ where: { id } });
      return reply.status(204).end();
    } catch (err) {
      console.error("Failed to delete user:", err);
      return reply.status(500).send({ error: "failed_to_delete_user" });
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return reply.status(400).send({
        error: "validation_failed",
        message: "Email and password are required",
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          password: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return reply.status(401).send({
          error: "invalid_credentials",
          message: "Invalid email or password",
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return reply.status(401).send({
          error: "invalid_credentials",
          message: "Invalid email or password",
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      const { password: _, ...userInfo } = user;

      return reply.send({
        user: userInfo,
        message: "Login successful",
      });
    } catch (err) {
      console.error("Login error:", err);
      return reply.status(500).send({ error: "login_failed" });
    }
  });
}