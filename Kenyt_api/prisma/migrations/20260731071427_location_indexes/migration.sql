/*
  Warnings:

  - You are about to drop the column `deliveryLatitude` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryLocation` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryLongitude` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `pickupLatitude` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `pickupLocation` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `pickupLongitude` on the `Order` table. All the data in the column will be lost.
  - Added the required column `deliveryLocationId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupLocationId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deliveryLatitude",
DROP COLUMN "deliveryLocation",
DROP COLUMN "deliveryLongitude",
DROP COLUMN "pickupLatitude",
DROP COLUMN "pickupLocation",
DROP COLUMN "pickupLongitude",
ADD COLUMN     "deliveryLocationId" INTEGER NOT NULL,
ADD COLUMN     "pickupLocationId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "locations" (
    "locationId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("locationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");

-- CreateIndex
CREATE INDEX "locations_name_idx" ON "locations"("name");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_pickupLocationId_idx" ON "Order"("pickupLocationId");

-- CreateIndex
CREATE INDEX "Order_deliveryLocationId_idx" ON "Order"("deliveryLocationId");

-- CreateIndex
CREATE INDEX "allocations_orderId_idx" ON "allocations"("orderId");

-- CreateIndex
CREATE INDEX "allocations_truckId_idx" ON "allocations"("truckId");

-- CreateIndex
CREATE INDEX "truck_locations_lat_lng_idx" ON "truck_locations"("lat", "lng");

-- CreateIndex
CREATE INDEX "trucks_status_idx" ON "trucks"("status");

-- CreateIndex
CREATE INDEX "trucks_capacity_tonnes_idx" ON "trucks"("capacity_tonnes");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "locations"("locationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryLocationId_fkey" FOREIGN KEY ("deliveryLocationId") REFERENCES "locations"("locationId") ON DELETE RESTRICT ON UPDATE CASCADE;
