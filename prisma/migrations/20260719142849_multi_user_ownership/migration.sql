-- Multi-user ownership: AdminUser -> User (rename, keeps existing row/data),
-- add pinHash for PIN-based login, and scope Person/Visit to an owning User.
-- Existing Person/Visit rows are backfilled onto the single pre-existing
-- account so nothing is lost when accounts become separate (Project.md §6).

ALTER TABLE "AdminUser" RENAME TO "User";
ALTER TABLE "User" ADD COLUMN "pinHash" TEXT;

ALTER TABLE "Person" ADD COLUMN "ownerId" TEXT;
UPDATE "Person" SET "ownerId" = (SELECT "id" FROM "User" LIMIT 1);
ALTER TABLE "Person" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Person" ADD CONSTRAINT "Person_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Person_ownerId_idx" ON "Person"("ownerId");

ALTER TABLE "Visit" ADD COLUMN "ownerId" TEXT;
UPDATE "Visit" SET "ownerId" = (SELECT "id" FROM "User" LIMIT 1);
ALTER TABLE "Visit" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Visit_ownerId_idx" ON "Visit"("ownerId");
