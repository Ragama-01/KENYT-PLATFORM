-- CreateTable
CREATE TABLE "truck_locations" (
    "truck_id" INTEGER NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "as_of" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "truck_locations_pkey" PRIMARY KEY ("truck_id")
);

-- AddForeignKey
ALTER TABLE "truck_locations" ADD CONSTRAINT "truck_locations_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("truckid") ON DELETE CASCADE ON UPDATE CASCADE;
