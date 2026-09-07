-- CreateTable
CREATE TABLE "containers" (
    "container_id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "container_number" TEXT NOT NULL,
    "container_type" TEXT,
    "weight_tonnes" DECIMAL(8, 2) NOT NULL,
    "cargo_type" TEXT NOT NULL,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("container_id")
);

-- CreateIndex
CREATE INDEX "containers_order_id_idx" ON "containers"("order_id");

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;