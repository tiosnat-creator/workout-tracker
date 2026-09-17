CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "MagicLinkPurpose" AS ENUM ('LOGIN', 'SIGNUP');
ALTER TABLE "User" ADD COLUMN "gender" "Gender",
    ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
-- Existing accounts retain their current login experience.
UPDATE "User" SET "onboardingCompletedAt" = CURRENT_TIMESTAMP;
ALTER TABLE "MagicLinkToken" ADD COLUMN "purpose" "MagicLinkPurpose" NOT NULL DEFAULT 'LOGIN';
