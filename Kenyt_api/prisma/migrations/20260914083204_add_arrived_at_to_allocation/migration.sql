-- AlterTable
ALTER TABLE "allocations" ADD COLUMN     "arrivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");
