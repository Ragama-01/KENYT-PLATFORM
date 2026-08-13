/*
  Warnings:

  - You are about to drop the column `trailer_comesa_date_expiry` on the `trucks` table. All the data in the column will be lost.
  - You are about to drop the column `trailer_comesa_date_taken` on the `trucks` table. All the data in the column will be lost.
  - You are about to drop the column `trailer_comesa_insurer` on the `trucks` table. All the data in the column will be lost.
  - You are about to drop the column `trailer_comesa_policy_number` on the `trucks` table. All the data in the column will be lost.
  - You are about to drop the column `trailer_comesa_premium_amount` on the `trucks` table. All the data in the column will be lost.
  - You are about to drop the column `trailer_insurance_expiry` on the `trucks` table. All the data in the column will be lost.
  - You are about to drop the column `trailer_insurance_issued` on the `trucks` table. All the data in the column will be lost.
  - You are about to drop the column `trailer_insurance_ref` on the `trucks` table. All the data in the column will be lost.
  - You are about to drop the column `trailer_registration` on the `trucks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "trucks" DROP COLUMN "trailer_comesa_date_expiry",
DROP COLUMN "trailer_comesa_date_taken",
DROP COLUMN "trailer_comesa_insurer",
DROP COLUMN "trailer_comesa_policy_number",
DROP COLUMN "trailer_comesa_premium_amount",
DROP COLUMN "trailer_insurance_expiry",
DROP COLUMN "trailer_insurance_issued",
DROP COLUMN "trailer_insurance_ref",
DROP COLUMN "trailer_registration";

-- CreateTable
CREATE TABLE "trailers" (
    "trailer_id" SERIAL NOT NULL,
    "truck_id" INTEGER NOT NULL,
    "registration_number" TEXT NOT NULL,
    "insurance_issued" DATE,
    "insurance_expiry" DATE,
    "insurance_ref" TEXT,
    "comesa_policy_number" TEXT,
    "comesa_insurer" TEXT,
    "comesa_date_taken" DATE,
    "comesa_date_expiry" DATE,
    "comesa_premium_amount" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trailers_pkey" PRIMARY KEY ("trailer_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trailers_truck_id_key" ON "trailers"("truck_id");

-- CreateIndex
CREATE INDEX "trailers_truck_id_idx" ON "trailers"("truck_id");

-- AddForeignKey
ALTER TABLE "trailers" ADD CONSTRAINT "trailers_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truckid") ON DELETE CASCADE ON UPDATE CASCADE;