-- Rollback for 20261124122500_add_truck_details_fields

-- Remove foreign key constraint first
ALTER TABLE "trucks"
  DROP CONSTRAINT IF EXISTS "trucks_driver_id_fkey";

-- Drop unique constraint
ALTER TABLE "trucks"
  DROP CONSTRAINT IF EXISTS "trucks_registration_number_key";

-- Drop added columns
ALTER TABLE "trucks"
  DROP COLUMN IF EXISTS "trailer_registration",
  DROP COLUMN IF EXISTS "tgl_2027",
  DROP COLUMN IF EXISTS "logbook_truck",
  DROP COLUMN IF EXISTS "logbook_trailer",
  DROP COLUMN IF EXISTS "policy_number",
  DROP COLUMN IF EXISTS "serial_number",
  DROP COLUMN IF EXISTS "inspection_sticker_no",
  DROP COLUMN IF EXISTS "driver_id",
  DROP COLUMN IF EXISTS "driver_name",
  DROP COLUMN IF EXISTS "image_url";
