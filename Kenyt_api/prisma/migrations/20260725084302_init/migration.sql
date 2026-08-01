-- CreateEnum
CREATE TYPE "TruckStatus" AS ENUM ('available', 'assigned', 'in_transit', 'maintenance');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('active', 'on_leave', 'exited');

-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('insurance', 'inspection', 'speed_governor');

-- CreateTable
CREATE TABLE "trucks" (
    "truck_id" SERIAL NOT NULL,
    "registration_number" TEXT NOT NULL,
    "year_of_manufacture" INTEGER NOT NULL,
    "trailer_registration" TEXT,
    "status" "TruckStatus" NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("truck_id")
);

-- CreateTable
CREATE TABLE "truck_compliance" (
    "compliance_id" SERIAL NOT NULL,
    "truck_id" INTEGER NOT NULL,
    "compliance_type" "ComplianceType" NOT NULL,
    "issued_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "document_ref" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_compliance_pkey" PRIMARY KEY ("compliance_id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "driver_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "id_number" TEXT NOT NULL,
    "truck_id" INTEGER,
    "date_of_joining" DATE NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("driver_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trucks_registration_number_key" ON "trucks"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_id_number_key" ON "drivers"("id_number");

-- AddForeignKey
ALTER TABLE "truck_compliance" ADD CONSTRAINT "truck_compliance_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truck_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truck_id") ON DELETE SET NULL ON UPDATE CASCADE;
