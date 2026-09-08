-- AlterTable
ALTER TABLE "containers" ADD COLUMN "truck_id" INTEGER;

-- CreateIndex
CREATE INDEX "containers_truck_id_idx" ON "containers"("truck_id");

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truckid") ON DELETE SET NULL ON UPDATE CASCADE;