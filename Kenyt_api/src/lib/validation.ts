import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const currentYear = new Date().getFullYear();

// ---------- Truck ----------
// Mirrors TruckForm's zod schema on the frontend field-for-field —
// including the COMESA and trailer sections, which the previous version
// of this schema didn't validate at all.

const truckBaseSchema = z.object({
  registration_number: z
    .string()
    .min(1)
    .regex(/^K[A-Z]{2}\s?\d{3}[A-Z]$/i, "Expected format e.g. KDA 123B"),
  year_of_manufacture: z.number().int().min(1980).max(currentYear),
  capacity_tonnes: z.number().positive(),

  inspection_issued: dateStr,
  inspection_expiry: dateStr,
  speed_governor_issued: dateStr,
  speed_governor_expiry: dateStr,

  truck_insurance_issued: dateStr,
  truck_insurance_expiry: dateStr,
  truck_insurance_ref: z.string().optional(),

  truck_comesa_policy_number: z.string().min(1),
  truck_comesa_insurer: z.string().min(1),
  truck_comesa_date_taken: dateStr,
  truck_comesa_date_expiry: dateStr,
  truck_comesa_premium_amount: z.number().positive(),

  trailer_registration: z.string().optional(),

  trailer_insurance_issued: dateStr.optional(),
  trailer_insurance_expiry: dateStr.optional(),
  trailer_insurance_ref: z.string().optional(),

  trailer_comesa_policy_number: z.string().optional(),
  trailer_comesa_insurer: z.string().optional(),
  trailer_comesa_date_taken: dateStr.optional(),
  trailer_comesa_date_expiry: dateStr.optional(),
  trailer_comesa_premium_amount: z.number().positive().optional(),
});

export const truckRegistrationSchema = truckBaseSchema
  .refine((d) => d.inspection_expiry > d.inspection_issued, {
    message: "Inspection expiry must be after issue date",
    path: ["inspection_expiry"],
  })
  .refine((d) => d.speed_governor_expiry > d.speed_governor_issued, {
    message: "Speed governor expiry must be after issue date",
    path: ["speed_governor_expiry"],
  })
  .refine((d) => d.truck_insurance_expiry > d.truck_insurance_issued, {
    message: "Insurance expiry must be after issue date",
    path: ["truck_insurance_expiry"],
  })
  .refine((d) => d.truck_comesa_date_expiry > d.truck_comesa_date_taken, {
    message: "COMESA expiry must be after date taken",
    path: ["truck_comesa_date_expiry"],
  });

// Same fields, but every one optional — for PUT, where a partial update
// is valid (you're not required to resend every field every time). Skips
// the cross-field .refine() checks above; re-validate those in the route
// if both sides of a pair are present in the request body.
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
  phone_number: z
    .string()
    .regex(/^(?:\+254|0)7\d{8}$|^(?:\+254|0)1\d{8}$/, "Enter a valid Kenyan phone number"),
  email: z.string().email(),
  nssf_number: z.string().min(1),
  shif_number: z.string().min(1),
});

export const driverUpdateSchema = driverRegistrationSchema.partial();

export type DriverRegistrationInput = z.infer<typeof driverRegistrationSchema>;