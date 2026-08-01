import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const trucksRouter = Router();
export const driversRouter = Router();

// ---------- Trucks ----------
// Truck's Prisma fields are already snake_case and match the frontend's
// TruckFormValues directly — the only mismatch is the primary key, which
// is `truckId` (mapped to the `truckid` column) instead of `id`.

trucksRouter.get("/", async (_req, res) => {
  try {
    const trucks = await prisma.truck.findMany({
      orderBy: { registration_number: "asc" },
    });
    res.json(trucks.map((t) => ({ ...t, id: t.truckId })));
  } catch (err) {
    res.status(500).json({ message: "Failed to load trucks" });
  }
});

trucksRouter.get("/:id", async (req, res) => {
  try {
    const truck = await prisma.truck.findUnique({
      where: { truckId: Number(req.params.id) },
    });
    if (!truck) return res.status(404).json({ message: "Truck not found" });
    res.json({ ...truck, id: truck.truckId });
  } catch (err) {
    res.status(500).json({ message: "Failed to load truck" });
  }
});

// POST /trucks — you already have this; shown for context.
// `status` has no default in the schema and TruckForm doesn't collect one,
// so default new trucks to "available" here.
trucksRouter.post("/", async (req, res) => {
  try {
    const truck = await prisma.truck.create({
      data: { ...req.body, status: req.body.status ?? "available" },
    });
    res.status(201).json({ ...truck, id: truck.truckId });
  } catch (err) {
    res.status(400).json({ message: "Failed to save truck" });
  }
});

// PUT /trucks/:id — powers editing from TruckForm
trucksRouter.put("/:id", async (req, res) => {
  try {
    const truck = await prisma.truck.update({
      where: { truckId: Number(req.params.id) },
      data: req.body,
    });
    res.json({ ...truck, id: truck.truckId });
  } catch (err) {
    res.status(400).json({ message: "Failed to update truck" });
  }
});

// DELETE /trucks/:id — powers the Delete button on TrucksListPage
trucksRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.truck.delete({ where: { truckId: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ message: "Failed to delete truck" });
  }
});

// ---------- Drivers ----------
// Driver's Prisma fields are camelCase (fullName, idNumber, kraPin, ...)
// while the frontend uses snake_case (full_name, id_number, kra_pin, ...),
// so requests/responses need translating both ways.

function toApiDriver(d: any) {
  return {
    id: d.driverId,
    full_name: d.fullName,
    id_number: d.idNumber,
    truck_id: d.truckId,
    date_of_joining: d.dateOfJoining,
    status: d.status,
    kra_pin: d.kraPin,
    phone_number: d.phoneNumber,
    email: d.email,
    nssf_number: d.nssfNumber,
    shif_number: d.shifNumber,
  };
}

function fromApiDriver(body: any) {
  return {
    fullName: body.full_name,
    idNumber: body.id_number,
    truckId: body.truck_id ?? null,
    dateOfJoining: body.date_of_joining,
    kraPin: body.kra_pin,
    phoneNumber: body.phone_number,
    email: body.email,
    nssfNumber: body.nssf_number,
    shifNumber: body.shif_number,
  };
}

driversRouter.get("/", async (_req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { fullName: "asc" },
    });
    res.json(drivers.map(toApiDriver));
  } catch (err) {
    res.status(500).json({ message: "Failed to load drivers" });
  }
});

driversRouter.get("/:id", async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { driverId: Number(req.params.id) },
    });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(toApiDriver(driver));
  } catch (err) {
    res.status(500).json({ message: "Failed to load driver" });
  }
});

// POST /drivers — you already have this; shown for context.
// `status` defaults to "active" in the schema, so it's left out here.
driversRouter.post("/", async (req, res) => {
  try {
    const driver = await prisma.driver.create({ data: fromApiDriver(req.body) });
    res.status(201).json(toApiDriver(driver));
  } catch (err) {
    res.status(400).json({ message: "Failed to save driver" });
  }
});

// PUT /drivers/:id — powers editing from DriverForm
driversRouter.put("/:id", async (req, res) => {
  try {
    const driver = await prisma.driver.update({
      where: { driverId: Number(req.params.id) },
      data: fromApiDriver(req.body),
    });
    res.json(toApiDriver(driver));
  } catch (err) {
    res.status(400).json({ message: "Failed to update driver" });
  }
});

// DELETE /drivers/:id — powers the Delete button on DriversListPage
driversRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.driver.delete({ where: { driverId: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ message: "Failed to delete driver" });
  }
});

// In your main server file:
//
//   import { trucksRouter, driversRouter } from "./routes/fleet";
//   app.use("/trucks", trucksRouter);
//   app.use("/drivers", driversRouter);