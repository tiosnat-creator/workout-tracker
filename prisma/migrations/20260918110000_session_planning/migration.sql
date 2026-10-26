CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

ALTER TABLE "Session"
ADD COLUMN "status" "SessionStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN "planNotes" TEXT,
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3);

-- Sessions created before planning existed already represent completed work.
UPDATE "Session" SET "startedAt" = "createdAt", "completedAt" = "createdAt";

CREATE TABLE "PlannedExercise" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "liftId" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlannedExercise_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SetEntry" ADD COLUMN "plannedExerciseId" TEXT;
CREATE INDEX "PlannedExercise_sessionId_idx" ON "PlannedExercise"("sessionId");
CREATE INDEX "PlannedExercise_liftId_idx" ON "PlannedExercise"("liftId");
CREATE INDEX "SetEntry_plannedExerciseId_idx" ON "SetEntry"("plannedExerciseId");

ALTER TABLE "PlannedExercise" ADD CONSTRAINT "PlannedExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlannedExercise" ADD CONSTRAINT "PlannedExercise_liftId_fkey" FOREIGN KEY ("liftId") REFERENCES "Lift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SetEntry" ADD CONSTRAINT "SetEntry_plannedExerciseId_fkey" FOREIGN KEY ("plannedExerciseId") REFERENCES "PlannedExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
