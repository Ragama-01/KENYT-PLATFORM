-- AlterTable
ALTER TABLE "trailers" ADD COLUMN     "logbook_number" TEXT;

-- AlterTable
ALTER TABLE "trucks" ADD COLUMN     "factors_to_note" TEXT,
ADD COLUMN     "inspection_cert_number" TEXT,
ADD COLUMN     "tgl_number" TEXT,
ADD COLUMN     "tgl_year" TEXT,
ADD COLUMN     "truck_insurance_purchase" DATE,
ADD COLUMN     "truck_insurance_serial" TEXT;

-- CreateTable
CREATE TABLE "truck_insurance_history" (
    "id" SERIAL NOT NULL,
    "truck_id" INTEGER NOT NULL,
    "policy_number" TEXT,
    "serial_number" TEXT,
    "insurer" TEXT,
    "issued_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "purchase_date" DATE,
    "premiumAmount" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_insurance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_tgl_history" (
    "id" SERIAL NOT NULL,
    "truck_id" INTEGER NOT NULL,
    "tgl_number" TEXT,
    "tgl_year" TEXT,
    "issued_date" DATE,
    "expiry_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_tgl_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_inspection_history" (
    "id" SERIAL NOT NULL,
    "truck_id" INTEGER NOT NULL,
    "cert_number" TEXT,
    "inspection_body" TEXT,
    "issued_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_inspection_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trailer_insurance_history" (
    "id" SERIAL NOT NULL,
    "trailer_id" INTEGER NOT NULL,
    "policy_number" TEXT,
    "insurer" TEXT,
    "issued_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "premiumAmount" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trailer_insurance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trailer_comesa_history" (
    "id" SERIAL NOT NULL,
    "trailer_id" INTEGER NOT NULL,
    "policy_number" TEXT,
    "insurer" TEXT,
    "date_taken" DATE,
    "date_expiry" DATE,
    "premiumAmount" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trailer_comesa_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "truck_insurance_history_truck_id_idx" ON "truck_insurance_history"("truck_id");

-- CreateIndex
CREATE INDEX "truck_tgl_history_truck_id_idx" ON "truck_tgl_history"("truck_id");

-- CreateIndex
CREATE INDEX "truck_inspection_history_truck_id_idx" ON "truck_inspection_history"("truck_id");

-- CreateIndex
CREATE INDEX "trailer_insurance_history_trailer_id_idx" ON "trailer_insurance_history"("trailer_id");

-- CreateIndex
CREATE INDEX "trailer_comesa_history_trailer_id_idx" ON "trailer_comesa_history"("trailer_id");

-- AddForeignKey
ALTER TABLE "truck_insurance_history" ADD CONSTRAINT "truck_insurance_history_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truckid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_tgl_history" ADD CONSTRAINT "truck_tgl_history_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truckid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_inspection_history" ADD CONSTRAINT "truck_inspection_history_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truckid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trailer_insurance_history" ADD CONSTRAINT "trailer_insurance_history_trailer_id_fkey" FOREIGN KEY ("trailer_id") REFERENCES "trailers"("trailer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trailer_comesa_history" ADD CONSTRAINT "trailer_comesa_history_trailer_id_fkey" FOREIGN KEY ("trailer_id") REFERENCES "trailers"("trailer_id") ON DELETE CASCADE ON UPDATE CASCADE;
