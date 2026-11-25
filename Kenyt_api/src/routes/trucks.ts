import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { authenticate, requireRole, WRITE_ROLES } from "../middleware/auth";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import sharp from "sharp";

import {
  truckRegistrationSchema,
  truckUpdateSchema,
} from "../lib/validation";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGE_WIDTH = 1200;

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function computeStatus(
  expiry: Date | null
): "valid" | "expiring_soon" | "expired" {
  if (!expiry) return "expired";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiry);
  expiryDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring_soon";
  return "valid";
}

export default async function truckRoutes(app: FastifyInstance) {
  // Register multipart for image uploads
  await app.register(fastifyMultipart, {
    limits: {
      fields: 10,
      files: 1,
      fieldNameSize: 100,
      fileSize: MAX_IMAGE_SIZE,
    },
  });

  // Serve uploaded images statically
  await app.register(fastifyStatic, {
    root: UPLOAD_DIR,
    prefix: "/uploads/",
  });

  // ---------------------------------------------------------------
  // Auth: all truck routes require authentication
  // ---------------------------------------------------------------
  app.addHook("preHandler", authenticate());

  // ---------------------------------------------------------------
  // Register Truck (admin/ops only)
  // ---------------------------------------------------------------
  app.post(
    "/trucks",
    { preHandler: requireRole(WRITE_ROLES) },
    async (request, reply) => {
      const parsed = truckRegistrationSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "validation_failed",
          details: parsed.error.flatten(),
        });
      }

      const v = parsed.data;

      try {
        // Build create data dynamically to handle required Int field
        const createData: any = {
          registration_number: v.registration_number.toUpperCase().trim(),
          capacity_tonnes: v.capacity_tonnes ?? null,
          controlTechUnitId: v.controlTechUnitId ?? undefined,
          logbook_number: v.logbook_number || null,

          status: "available",

          // New truck details fields
          trailerRegistration: v.trailer_registration || null,
          tgl2027: v.tgl_2027 || null,
          logbookTruck: v.logbook_truck || null,
          logbookTrailer: v.logbook_trailer || null,
          policyNumber: v.policy_number || null,
          serialNumber: v.serial_number || null,
          inspectionStickerNo: v.inspection_sticker_no || null,
          driverId: v.driver_id ?? null,
          driverName: v.driver_name || null,
          imageUrl: v.image_url || null,

          // Truck insurance
          truck_insurance_issued: v.truck_insurance_issued
            ? new Date(v.truck_insurance_issued)
            : null,
          truck_insurance_expiry: v.truck_insurance_expiry
            ? new Date(v.truck_insurance_expiry)
            : null,
          truck_insurance_ref: v.truck_insurance_ref || null,
          truck_insurance_serial: v.truck_insurance_serial || null,
          truck_insurance_purchase: v.truck_insurance_purchase
            ? new Date(v.truck_insurance_purchase)
            : null,

          // TGL
          tgl_number: v.tgl_number || null,
          tgl_year: v.tgl_year || null,

          // Inspection
          inspection_issued: v.inspection_issued
            ? new Date(v.inspection_issued)
            : null,
          inspection_expiry: v.inspection_expiry
            ? new Date(v.inspection_expiry)
            : null,
          inspection_cert_number: v.inspection_cert_number || null,

          // Speed governor
          speed_governor_issued: v.speed_governor_issued
            ? new Date(v.speed_governor_issued)
            : null,
          speed_governor_expiry: v.speed_governor_expiry
            ? new Date(v.speed_governor_expiry)
            : null,

          // COMESA
          truck_comesa_policy_number:
            v.truck_comesa_policy_number ?? null,
          truck_comesa_insurer: v.truck_comesa_insurer ?? null,
          truck_comesa_date_taken: v.truck_comesa_date_taken
            ? new Date(v.truck_comesa_date_taken)
            : null,
          truck_comesa_date_expiry: v.truck_comesa_date_expiry
            ? new Date(v.truck_comesa_date_expiry)
            : null,
          truck_comesa_premium_amount:
            v.truck_comesa_premium_amount ?? null,

          // Notes
          factors_to_note: v.factors_to_note || null,
        };

        if (v.year_of_manufacture !== undefined) {
          createData.year_of_manufacture = v.year_of_manufacture;
        }

        if (v.trailer) {
          createData.trailer = {
            create: {
              registration_number:
                v.trailer.registration_number || null,
              logbook_number: v.trailer.logbook_number || null,

              insurance_issued: v.trailer.insurance_issued
                ? new Date(v.trailer.insurance_issued)
                : null,
              insurance_expiry: v.trailer.insurance_expiry
                ? new Date(v.trailer.insurance_expiry)
                : null,
              insurance_ref: v.trailer.insurance_ref || null,

              comesa_policy_number:
                v.trailer.comesa_policy_number || null,
              comesa_insurer: v.trailer.comesa_insurer || null,
              comesa_date_taken: v.trailer.comesa_date_taken
                ? new Date(v.trailer.comesa_date_taken)
                : null,
              comesa_date_expiry: v.trailer.comesa_date_expiry
                ? new Date(v.trailer.comesa_date_expiry)
                : null,
              comesa_premium_amount:
                v.trailer.comesa_premium_amount ?? null,
            },
          };
        }

        const truck = await prisma.truck.create({
          data: createData,
          include: {
            trailer: true,
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
    }
  );

  // ---------------------------------------------------------------
  // List all trucks with search, filter, pagination
  // ---------------------------------------------------------------
  app.get("/trucks", async (request: any, reply) => {
    try {
      const query = request.query as {
        page?: string;
        limit?: string;
        search?: string;
        filter?: "all" | "expired" | "expiring_soon";
        driver?: string;
      };

      const pageNum = Math.max(1, parseInt(query.page ?? "1", 10));
      const limitNum = Math.min(
        100,
        Math.max(1, parseInt(query.limit ?? "20", 10))
      );
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      // Search by registration or driver name
      if (query.search) {
        where.OR = [
          {
            registration_number: {
              contains: query.search.toUpperCase().trim(),
              mode: "insensitive",
            },
          },
          {
            driver_name: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ];
      }

      // Filter by driver name
      if (query.driver) {
        where.driver_name = {
          contains: query.driver,
          mode: "insensitive",
        };
      }

      const [trucks, total] = await prisma.$transaction([
        prisma.truck.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: {
            registration_number: "asc",
          },
          include: {
            trailer: true,
          },
        }),
        prisma.truck.count({ where }),
      ]);

      const results = trucks.map((truck) => ({
        id: truck.truckId,
        ...truck,
        insurance_status: computeStatus(truck.truck_insurance_expiry),
        inspection_status: computeStatus(truck.inspection_expiry),
      }));

      // Apply expiry filter in-memory since it's computed
      let filtered = results;
      if (query.filter === "expired") {
        filtered = results.filter(
          (r) =>
            r.insurance_status === "expired" ||
            r.inspection_status === "expired"
        );
      } else if (query.filter === "expiring_soon") {
        filtered = results.filter(
          (r) =>
            (r.insurance_status === "expiring_soon" &&
              r.inspection_status !== "expired") ||
            (r.inspection_status === "expiring_soon" &&
              r.insurance_status !== "expired")
        );
      }

      return reply.send({
        data: filtered,
        meta: {
          total: filtered.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(filtered.length / limitNum),
        },
      });
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        error: "server_error",
      });
    }
  });

  // ---------------------------------------------------------------
  // Get one truck
  // ---------------------------------------------------------------
  app.get("/trucks/:id", async (request: any, reply) => {
    try {
      const truck = await prisma.truck.findUnique({
        where: {
          truckId: Number(request.params.id),
        },
        include: {
          trailer: true,
          insuranceHistory: {
            orderBy: { createdAt: "desc" },
          },
          tglHistory: {
            orderBy: { createdAt: "desc" },
          },
          inspectionHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!truck) {
        return reply.status(404).send({
          error: "Truck not found",
        });
      }

      // Also fetch trailer history if trailer exists
      let trailerInsuranceHistory: any[] = [];
      let trailerCOMESAHistory: any[] = [];
      if (truck.trailer?.trailerId) {
        trailerInsuranceHistory = await prisma.trailerInsuranceHistory.findMany({
          where: { trailerId: truck.trailer.trailerId },
          orderBy: { createdAt: "desc" },
        });
        trailerCOMESAHistory = await prisma.trailerCOMESAHistory.findMany({
          where: { trailerId: truck.trailer.trailerId },
          orderBy: { createdAt: "desc" },
        });
      }

      return reply.send({
        id: truck.truckId,
        ...truck,
        insurance_status: computeStatus(truck.truck_insurance_expiry),
        inspection_status: computeStatus(truck.inspection_expiry),
        trailerInsuranceHistory,
        trailerCOMESAHistory,
      });
    } catch (err) {
      request.log.error(err);

      return reply.status(500).send({
        error: "server_error",
      });
    }
  });

  // ---------------------------------------------------------------
  // Update truck (admin/ops only)
  // ---------------------------------------------------------------
  app.put(
    "/trucks/:id",
    { preHandler: requireRole(WRITE_ROLES) },
    async (request: any, reply) => {
      const parsed = truckUpdateSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "validation_failed",
          details: parsed.error.flatten(),
        });
      }

      const v = parsed.data;
      const truckId = Number(request.params.id);

      try {
        const currentTruck = await prisma.truck.findUnique({
          where: { truckId },
          include: { trailer: true },
        });

        if (!currentTruck) {
          return reply.status(404).send({ error: "Truck not found" });
        }

      // Separate trailer data from truck data
      const { trailer, ...truckData } = v;

      // Normalize registration if provided
      if (truckData.registration_number) {
        truckData.registration_number = truckData.registration_number
          .toUpperCase()
          .trim();
      }

      // Convert date strings to Date objects for truck fields
      const dateFields = [
        "inspection_issued",
        "inspection_expiry",
        "speed_governor_issued",
        "speed_governor_expiry",
        "truck_insurance_issued",
        "truck_insurance_expiry",
        "truck_insurance_purchase",
        "truck_comesa_date_taken",
        "truck_comesa_date_expiry",
      ] as const;

      const data: any = { ...truckData };
      for (const field of dateFields) {
        if (data[field] !== undefined && data[field] !== null) {
          data[field] = new Date(data[field]);
        } else if (data[field] === null) {
          data[field] = null;
        }
      }

      // Remove undefined values so Prisma doesn't try to set them
      const cleanData: any = {};
      for (const [k, val] of Object.entries(data)) {
        if (val !== undefined) {
          cleanData[k] = val;
        }
      }

      const truck = await prisma.truck.update({
        where: { truckId },
        data: cleanData,
        include: { trailer: true },
      });

      // Handle trailer upsert
      if (trailer) {
        await prisma.trailer.upsert({
          where: { truckId },
          create: {
            truckId,
            registration_number: trailer.registration_number || null,
            logbook_number: trailer.logbook_number || null,
            insurance_issued: trailer.insurance_issued
              ? new Date(trailer.insurance_issued)
              : null,
            insurance_expiry: trailer.insurance_expiry
              ? new Date(trailer.insurance_expiry)
              : null,
            insurance_ref: trailer.insurance_ref || null,
            comesa_policy_number: trailer.comesa_policy_number || null,
            comesa_insurer: trailer.comesa_insurer || null,
            comesa_date_taken: trailer.comesa_date_taken
              ? new Date(trailer.comesa_date_taken)
              : null,
            comesa_date_expiry: trailer.comesa_date_expiry
              ? new Date(trailer.comesa_date_expiry)
              : null,
            comesa_premium_amount: trailer.comesa_premium_amount ?? null,
          },
          update: {
            registration_number: trailer.registration_number || null,
            logbook_number: trailer.logbook_number || null,
            insurance_issued: trailer.insurance_issued
              ? new Date(trailer.insurance_issued)
              : null,
            insurance_expiry: trailer.insurance_expiry
              ? new Date(trailer.insurance_expiry)
              : null,
            insurance_ref: trailer.insurance_ref || null,
            comesa_policy_number: trailer.comesa_policy_number || null,
            comesa_insurer: trailer.comesa_insurer || null,
            comesa_date_taken: trailer.comesa_date_taken
              ? new Date(trailer.comesa_date_taken)
              : null,
            comesa_date_expiry: trailer.comesa_date_expiry
              ? new Date(trailer.comesa_date_expiry)
              : null,
            comesa_premium_amount: trailer.comesa_premium_amount ?? null,
          },
        });
      }

      // Re-fetch to return complete record
      const updatedTruck = await prisma.truck.findUnique({
        where: { truckId },
        include: { trailer: true },
      });

      return reply.send({
        id: updatedTruck?.truckId,
        ...updatedTruck,
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
  }
  );

  // ---------------------------------------------------------------
  // Upload truck image (admin/ops only)
  // ---------------------------------------------------------------
  app.post(
    "/trucks/:id/image",
    { preHandler: requireRole(WRITE_ROLES) },
    async (request: any, reply) => {
      const truckId = Number(request.params.id);

      try {
        const truck = await prisma.truck.findUnique({
          where: { truckId },
        });

        if (!truck) {
          return reply.status(404).send({ error: "Truck not found" });
        }

        const data = await request.file();

        if (!data) {
          return reply.status(400).send({
            error: "no_file",
            message: "No image file provided",
          });
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!allowedTypes.includes(data.mimetype)) {
          return reply.status(400).send({
            error: "invalid_file_type",
            message: "Only JPG and PNG images are allowed",
          });
        }

        // Validate file size
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        if (fileBuffer.length > MAX_IMAGE_SIZE) {
          return reply.status(400).send({
            error: "file_too_large",
            message: "Image must be smaller than 5 MB",
          });
        }

        // Resize image to max 1200px width
        const resized = await sharp(fileBuffer)
          .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
          .toFormat("jpeg", { quality: 85 })
          .toBuffer();

        // Generate filename
        const ext = data.mimetype === "image/png" ? "png" : "jpg";
        const filename = `truck-${truckId}-${Date.now()}.${ext}`;
        const filePath = path.join(UPLOAD_DIR, filename);

        fs.writeFileSync(filePath, resized);

        const imageUrl = `/uploads/${filename}`;

        // Delete old image if exists
        if (truck.imageUrl) {
          const oldPath = path.join(
            UPLOAD_DIR,
            path.basename(truck.imageUrl)
          );
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        // Update truck record
        await prisma.truck.update({
          where: { truckId },
          data: { imageUrl: imageUrl },
        });

        return reply.send({
          image_url: imageUrl,
          message: "Image uploaded successfully",
        });
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: "server_error" });
      }
    }
  );

  // ---------------------------------------------------------------
  // Delete truck (admin/ops only)
  // ---------------------------------------------------------------
  app.delete(
    "/trucks/:id",
    { preHandler: requireRole(WRITE_ROLES) },
    async (request: any, reply) => {
      try {
        // Delete associated image if exists
        const truck = await prisma.truck.findUnique({
          where: { truckId: Number(request.params.id) },
        });

        if (truck?.imageUrl) {
          const oldPath = path.join(
            UPLOAD_DIR,
            path.basename(truck.imageUrl)
          );
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

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
    }
  );

  // ---------------------------------------------------------------
  // Get truck insurance history
  // ---------------------------------------------------------------
  app.get("/trucks/:id/insurance-history", async (request: any, reply) => {
    try {
      const history = await prisma.truckInsuranceHistory.findMany({
        where: { truckId: Number(request.params.id) },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  // ---------------------------------------------------------------
  // Get truck TGL history
  // ---------------------------------------------------------------
  app.get("/trucks/:id/tgl-history", async (request: any, reply) => {
    try {
      const history = await prisma.truckTGLHistory.findMany({
        where: { truckId: Number(request.params.id) },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  // ---------------------------------------------------------------
  // Get truck inspection history
  // ---------------------------------------------------------------
  app.get("/trucks/:id/inspection-history", async (request: any, reply) => {
    try {
      const history = await prisma.truckInspectionHistory.findMany({
        where: { truckId: Number(request.params.id) },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  // ---------------------------------------------------------------
  // Get trailer insurance history
  // ---------------------------------------------------------------
  app.get("/trucks/:id/trailer/insurance-history", async (request: any, reply) => {
    try {
      const truck = await prisma.truck.findUnique({
        where: { truckId: Number(request.params.id) },
        select: { trailer: { select: { trailerId: true } } },
      });
      if (!truck?.trailer?.trailerId) {
        return reply.send([]);
      }
      const history = await prisma.trailerInsuranceHistory.findMany({
        where: { trailerId: truck.trailer.trailerId },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });

  // ---------------------------------------------------------------
  // Get trailer COMESA history
  // ---------------------------------------------------------------
  app.get("/trucks/:id/trailer/comesa-history", async (request: any, reply) => {
    try {
      const truck = await prisma.truck.findUnique({
        where: { truckId: Number(request.params.id) },
        select: { trailer: { select: { trailerId: true } } },
      });
      if (!truck?.trailer?.trailerId) {
        return reply.send([]);
      }
      const history = await prisma.trailerCOMESAHistory.findMany({
        where: { trailerId: truck.trailer.trailerId },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(history);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "server_error" });
    }
  });
}
