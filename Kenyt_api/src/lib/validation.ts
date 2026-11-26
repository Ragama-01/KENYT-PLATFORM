import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const currentYear = new Date().getFullYear();

// ---------- Truck ----------
// Mirrors TruckForm's zod schema on the frontend field-for-field —
// including the COMESA and trailer sections, which the previous version
// of this schema didn't validate at all.

const trailerSchema = z.object({
  registration_number: z.string().optional(),
  logbook_number: z.string().optional(),

  insurance_issued: dateStr.optional(),
  insurance_expiry: dateStr.optional(),
  insurance_ref: z.string().optional(),

  comesa_policy_number: z.string().optional(),
  comesa_insurer: z.string().optional(),
  comesa_date_taken: dateStr.optional(),
  comesa_date_expiry: dateStr.optional(),
  comesa_premium_amount: z.number().positive().optional(),
});

const truckBaseSchema = z.object({
  registration_number: z
    .string()
    .min(1)
    .regex(/^K[A-Z]{2}\s?\d{3}[A-Z]$/i, "Expected format e.g. KDA 123B"),

  // Truck registration form additions
  truck_type: z.string().min(1, "Truck type is required"),
  truck_make_model: z.string().optional(),
  speed_governor_cert_no: z.string().optional(),
  images: z.record(z.string()).optional(),

  // New truck details fields (Phase 1)
  trailer_registration: z.string().optional(),
  tgl_2027: z.string().optional(),
  logbook_truck: z.string().optional(),
  logbook_trailer: z.string().optional(),
  policy_number: z.string().optional(),
  serial_number: z.string().optional(),
  inspection_sticker_no: z.string().optional(),
  driver_id: z.number().int().positive().optional().nullable(),
  driver_name: z.string().optional(),
  image_url: z.string().url().optional().nullable(),

  year_of_manufacture: z.number().int().min(1980).max(currentYear).optional(),
  capacity_tonnes: z.number().positive().optional(),
  controlTechUnitId: z.number().int().positive().optional(),
  logbook_number: z.string().optional(),

  // Truck insurance
  truck_insurance_issued: dateStr.optional(),
  truck_insurance_expiry: dateStr.optional(),
  truck_insurance_ref: z.string().optional(),
  truck_insurance_serial: z.string().optional(),
  truck_insurance_purchase: dateStr.optional(),

  // TGL
  tgl_number: z.string().optional(),
  tgl_year: z.string().optional(),

  // Inspection
  inspection_issued: dateStr.optional(),
  inspection_expiry: dateStr.optional(),
  inspection_cert_number: z.string().optional(),

  // Speed governor
  speed_governor_issued: dateStr.optional(),
  speed_governor_expiry: dateStr.optional(),

  // COMESA
  truck_comesa_policy_number: z.string().optional(),
  truck_comesa_insurer: z.string().optional(),
  truck_comesa_date_taken: dateStr.optional(),
  truck_comesa_date_expiry: dateStr.optional(),
  truck_comesa_premium_amount: z.number().positive().optional(),

  // Notes
  factors_to_note: z.string().optional(),

  trailer: trailerSchema.optional(),
});

export const truckRegistrationSchema = truckBaseSchema
  .refine((d) => d.registration_number, {
    message: "Registration number is required",
    path: ["registration_number"],
  })
  .refine(
    (d) =>
      !d.truck_insurance_issued ||
      !d.truck_insurance_expiry ||
      d.truck_insurance_expiry > d.truck_insurance_issued,
    {
      message: "Insurance expiry must be after issue date",
      path: ["truck_insurance_expiry"],
    }
  )
  .refine(
    (d) =>
      !d.speed_governor_issued ||
      !d.speed_governor_expiry ||
      d.speed_governor_expiry > d.speed_governor_issued,
    {
      message: "Speed governor expiry must be after issue date",
      path: ["speed_governor_expiry"],
    }
  )
  .refine(
    (d) =>
      !d.inspection_issued ||
      !d.inspection_expiry ||
      d.inspection_expiry > d.inspection_issued,
    {
      message: "Inspection expiry must be after issue date",
      path: ["inspection_expiry"],
    }
  )
  .refine(
    (d) =>
      !d.truck_comesa_date_taken ||
      !d.truck_comesa_date_expiry ||
      d.truck_comesa_date_expiry > d.truck_comesa_date_taken,
    {
      message: "COMESA expiry must be after date taken",
      path: ["truck_comesa_date_expiry"],
    }
  )
  .refine(
    (d) =>
      !d.trailer?.insurance_issued ||
      !d.trailer?.insurance_expiry ||
      d.trailer.insurance_expiry > d.trailer.insurance_issued,
    {
      message: "Trailer insurance expiry must be after issue date",
      path: ["trailer", "insurance_expiry"],
    }
  )
  .refine(
    (d) =>
      !d.trailer?.comesa_date_taken ||
      !d.trailer?.comesa_date_expiry ||
      d.trailer.comesa_date_expiry > d.trailer.comesa_date_taken,
    {
      message: "Trailer COMESA expiry must be after date taken",
      path: ["trailer", "comesa_date_expiry"],
    }
  );

// Same fields, but every one optional — for PUT, where a partial update
// is valid (you're not required to resend every field every time).
export const truckUpdateSchema = truckBaseSchema.partial();

export type TruckRegistrationInput = z.infer<typeof truckRegistrationSchema>;

// ---------- Driver ----------
// Now includes the statutory/contact fields the previous schema omitted —
// they're required, unique columns on Driver, so POST was failing without them.

export const driverRegistrationSchema = z.object({
  full_name: z.string().min(2),
  id_number: z.string().regex(/^\d{6,10}$/, "Enter a valid national ID number"),
  truck_id: z.number().int().positive().optional().nullable(),
  date_of_joining: dateStr,

  kra_pin: z.string().regex(/^[A-Z]\d{9}[A-Z]$/i, "Expected format e.g. A012345678Z"),
  kpa_id: z.string().optional(),
  phone_number: z
    .string()
    .regex(/^(?:\+254|0)7\d{8}$|^(?:\+254|0)1\d{8}$/, "Enter a valid Kenyan phone number"),
  alternative_phone_number: z
    .string()
    .regex(/^(?:\+254|0)7\d{8}$|^(?:\+254|0)1\d{8}$/, "Enter a valid Kenyan phone number")
    .optional()
    .or(z.literal("")),
  email: z.string().email(),
  nssf_number: z.string().min(1),
  shif_number: z.string().min(1),
  certificate_of_good_conduct: z.string().optional(),
});

export const driverUpdateSchema = driverRegistrationSchema.partial();

export type DriverRegistrationInput = z.infer<typeof driverRegistrationSchema>;