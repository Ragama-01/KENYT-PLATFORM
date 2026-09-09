-- AlterTable: make bolNumber nullable so orders without a BOL can be stored.
-- The existing UNIQUE index on "Order"("bolNumber") already allows multiple NULLs
-- in PostgreSQL, so no index change is needed.
ALTER TABLE "Order" ALTER COLUMN "bolNumber" DROP NOT NULL;
