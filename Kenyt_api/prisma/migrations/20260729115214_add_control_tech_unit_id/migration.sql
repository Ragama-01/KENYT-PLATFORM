/*
  Warnings:

  - A unique constraint covering the columns `[control_tech_unit_id]` on the table `trucks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "trucks" ADD COLUMN     "control_tech_unit_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "trucks_control_tech_unit_id_key" ON "trucks"("control_tech_unit_id");
