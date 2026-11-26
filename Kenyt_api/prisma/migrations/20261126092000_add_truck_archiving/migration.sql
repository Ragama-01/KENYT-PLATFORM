ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "archived_by" TEXT;
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "archive_reason" TEXT;
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "archive_note" TEXT;
CREATE INDEX IF NOT EXISTS "trucks_archived_at_idx" ON "trucks"("archived_at");
