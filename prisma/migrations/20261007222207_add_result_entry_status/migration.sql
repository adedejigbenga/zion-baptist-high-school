-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- AlterTable
ALTER TABLE "ResultEntry" ADD COLUMN     "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT';

-- Backfill: entries that already belong to a SUBMITTED or PUBLISHED result were finished by their teachers.
UPDATE "ResultEntry" AS e
SET "status" = 'SUBMITTED'
FROM "Result" AS r
WHERE r."id" = e."resultId" AND r."status" IN ('SUBMITTED', 'PUBLISHED');
