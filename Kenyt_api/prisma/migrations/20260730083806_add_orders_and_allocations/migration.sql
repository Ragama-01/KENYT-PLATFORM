-- CreateTable
CREATE TABLE "Order" (
    "orderId" SERIAL NOT NULL,
    "bolNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "cargoWeightTonnes" DECIMAL(8,2) NOT NULL,
    "cargoType" TEXT NOT NULL,
    "loadType" TEXT NOT NULL,
    "containerNumber" TEXT,
    "containerType" TEXT,
    "pickupLocation" TEXT NOT NULL,
    "pickupLatitude" DECIMAL(9,6),
    "pickupLongitude" DECIMAL(9,6),
    "deliveryLocation" TEXT NOT NULL,
    "deliveryLatitude" DECIMAL(9,6),
    "deliveryLongitude" DECIMAL(9,6),
    "consigneeName" TEXT NOT NULL,
    "consigneePhone" TEXT,
    "freeStorageDays" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "specialInstructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "allocations" (
    "allocationId" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "truckId" INTEGER NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocatedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'allocated',

    CONSTRAINT "allocations_pkey" PRIMARY KEY ("allocationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_bolNumber_key" ON "Order"("bolNumber");

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("truckid") ON DELETE RESTRICT ON UPDATE CASCADE;
