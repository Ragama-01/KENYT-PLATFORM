import type { FastifyInstance } from "fastify";

export const WRITE_ROLES = ["admin", "super_admin"];

export function authenticate() {
  return async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: "unauthorized" });
    }
  };
}

export function requireRole(allowedRoles: string[]) {
  return async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const userRole = request.user?.role;
    if (!allowedRoles.includes(userRole)) {
      return reply.status(403).send({ error: "forbidden" });
    }
  };
}

export function getUserRole(request: any): string | undefined {
  return request.user?.role;
}
