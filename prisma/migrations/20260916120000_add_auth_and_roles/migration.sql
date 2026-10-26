-- Phase A of the multi-user auth migration (expand/contract — see the User
-- model comment in prisma/schema.prisma). Purely additive: the legacy
-- "email"/"passwordHash" columns are kept and "email" is relaxed to
-- nullable so open signup can create rows with no legacy value. A later
-- migration drops the legacy columns once prisma/seed.ts has backfilled
-- the owner row's new columns onto its existing id.

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "User" ADD COLUMN     "emailCiphertext" TEXT;
ALTER TABLE "User" ADD COLUMN     "emailHash" TEXT;
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailHash_key" ON "User"("emailHash");

-- At most one OWNER row, enforced at the DB layer rather than relying
-- solely on application logic (e.g. an OWNER_EMAIL change without an
-- explicit demote step).
CREATE UNIQUE INDEX "User_role_owner_key" ON "User"("role") WHERE "role" = 'OWNER';

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "emailCiphertext" TEXT NOT NULL,
    "requestIp" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_emailHash_idx" ON "MagicLinkToken"("emailHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_requestIp_idx" ON "MagicLinkToken"("requestIp");

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
