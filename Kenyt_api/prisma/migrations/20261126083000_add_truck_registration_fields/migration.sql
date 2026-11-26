ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "truck_type" TEXT;
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "truck_make_model" TEXT;
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "speed_governor_cert_no" TEXT;
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "images" JSONB;