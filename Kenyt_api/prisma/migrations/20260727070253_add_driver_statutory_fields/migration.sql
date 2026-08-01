/*
  Warnings:

  - A unique constraint covering the columns `[kra_pin]` on the table `drivers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone_number]` on the table `drivers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `drivers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nssf_number]` on the table `drivers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shif_number]` on the table `drivers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kra_pin` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nssf_number` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone_number` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shif_number` to the `drivers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "kra_pin" TEXT NOT NULL,
ADD COLUMN     "nssf_number" TEXT NOT NULL,
ADD COLUMN     "phone_number" TEXT NOT NULL,
ADD COLUMN     "shif_number" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "drivers_kra_pin_key" ON "drivers"("kra_pin");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_phone_number_key" ON "drivers"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_nssf_number_key" ON "drivers"("nssf_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_shif_number_key" ON "drivers"("shif_number");
