-- AlterTable
ALTER TABLE "trucks"
  ADD COLUMN "trailer_registration" TEXT,
  ADD COLUMN "tgl_2027" TEXT,
  ADD COLUMN "logbook_truck" TEXT,
  ADD COLUMN "logbook_trailer" TEXT,
  ADD COLUMN "policy_number" TEXT,
  ADD COLUMN "serial_number" TEXT,
  ADD COLUMN "inspection_sticker_no" TEXT,
  ADD COLUMN "driver_id" INT,
  ADD COLUMN "driver_name" TEXT,
  ADD COLUMN "image_url" TEXT;

-- Normalise existing registration_number values (uppercase, trimmed)
UPDATE "trucks"
SET "registration_number" = UPPER(TRIM("registration_number"))
WHERE "registration_number" IS NOT NULL;

-- Add unique constraint on registration_number
ALTER TABLE "trucks"
  ADD CONSTRAINT "trucks_registration_number_key" UNIQUE ("registration_number");

-- Foreign key to drivers table
ALTER TABLE "trucks"
  ADD CONSTRAINT "trucks_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id")
  ON DELETE SET NULL;
