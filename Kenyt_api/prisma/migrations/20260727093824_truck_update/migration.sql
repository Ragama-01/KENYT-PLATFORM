/*
  Warnings:

  - You are about to drop the `Truck` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_truck_id_fkey";

-- DropForeignKey
ALTER TABLE "truck_compliance" DROP CONSTRAINT "truck_compliance_truck_id_fkey";

-- DropTable
DROP TABLE "Truck";

-- CreateTable
CREATE TABLE "trucks" (
    "truckid" SERIAL NOT NULL,
    "registration_number" TEXT NOT NULL,
    "year_of_manufacture" INTEGER NOT NULL,
    "trailer_registration" TEXT,
    "status" "TruckStatus" NOT NULL,
    "inspection_issued" DATE,
    "inspection_expiry" DATE,
    "speed_governor_issued" DATE,
    "speed_governor_expiry" DATE,
    "truck_insurance_issued" DATE,
    "truck_insurance_expiry" DATE,
    "truck_insurance_ref" TEXT,
    "truck_comesa_policy_number" TEXT,
    "truck_comesa_insurer" TEXT,
    "truck_comesa_date_taken" DATE,
    "truck_comesa_date_expiry" DATE,
    "truck_comesa_premium_amount" DECIMAL(12,2),
    "trailer_insurance_issued" DATE,
    "trailer_insurance_expiry" DATE,
    "trailer_insurance_ref" TEXT,
    "trailer_comesa_policy_number" TEXT,
    "trailer_comesa_insurer" TEXT,
    "trailer_comesa_date_taken" DATE,
    "trailer_comesa_date_expiry" DATE,
    "trailer_comesa_premium_amount" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("truckid")
);

-- AddForeignKey
ALTER TABLE "truck_compliance" ADD CONSTRAINT "truck_compliance_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truckid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truckid") ON DELETE SET NULL ON UPDATE CASCADE;
