ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "archived_by" TEXT;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "archive_reason" TEXT;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "date_of_leaving" DATE;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "archive_note" TEXT;
CREATE INDEX IF NOT EXISTS "drivers_archived_at_idx" ON "drivers"("archived_at");
