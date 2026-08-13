-- AlterTable: Add KPA ID to drivers
ALTER TABLE "drivers" ADD COLUMN "kpa_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "drivers_kpa_id_key" ON "drivers"("kpa_id");

-- AlterTable: Fix trailers table to match schema
ALTER TABLE "trailers" ALTER COLUMN "registration_number" DROP NOT NULL;
ALTER TABLE "trailers" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;