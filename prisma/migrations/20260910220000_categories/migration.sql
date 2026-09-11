-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isUncategorized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one Category per (userId, distinct enum value) currently used by Lift
INSERT INTO "Category" ("id", "userId", "name", "isUncategorized", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text || "userId" || "category"::text),
    "userId",
    CASE "category"
        WHEN 'SNATCH' THEN 'Snatch'
        WHEN 'CLEAN_AND_JERK' THEN 'Clean & Jerk'
        WHEN 'SQUAT' THEN 'Squat'
        WHEN 'PULL' THEN 'Pull'
        WHEN 'PRESS' THEN 'Press'
        WHEN 'ACCESSORY' THEN 'Accessory'
        WHEN 'OTHER' THEN 'Other'
    END,
    false,
    CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "userId", "category" FROM "Lift") AS distinct_pairs;

-- Every user gets a protected Uncategorized fallback, even with no lifts yet
INSERT INTO "Category" ("id", "userId", "name", "isUncategorized", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text || "id" || 'uncategorized'),
    "id",
    'Uncategorized',
    true,
    CURRENT_TIMESTAMP
FROM "User";

-- AlterTable: add categoryId, backfill from the matching new Category row, then require it
ALTER TABLE "Lift" ADD COLUMN "categoryId" TEXT;

UPDATE "Lift" l
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."userId" = l."userId"
  AND c."name" = CASE l."category"
    WHEN 'SNATCH' THEN 'Snatch'
    WHEN 'CLEAN_AND_JERK' THEN 'Clean & Jerk'
    WHEN 'SQUAT' THEN 'Squat'
    WHEN 'PULL' THEN 'Pull'
    WHEN 'PRESS' THEN 'Press'
    WHEN 'ACCESSORY' THEN 'Accessory'
    WHEN 'OTHER' THEN 'Other'
  END;

ALTER TABLE "Lift" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "Lift" ADD CONSTRAINT "Lift_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lift" DROP COLUMN "category";

DROP TYPE "LiftCategory";
