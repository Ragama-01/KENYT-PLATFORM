import { PrismaClient } from "@prisma/client";

// Single shared instance — reused across routes instead of opening
// a new connection pool per request.
export const prisma = new PrismaClient();
