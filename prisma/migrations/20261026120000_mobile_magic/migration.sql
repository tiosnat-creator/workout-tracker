CREATE TABLE "MobileMagicChallenge" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tokenHash" TEXT NOT NULL,
 "verifierHash" TEXT NOT NULL,
 "userId" TEXT,
 "confirmedAt" TIMESTAMP(3),
 "claimedAt" TIMESTAMP(3),
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MobileMagicChallenge_tokenHash_key" ON "MobileMagicChallenge"("tokenHash");
CREATE INDEX "MobileMagicChallenge_expiresAt_idx" ON "MobileMagicChallenge"("expiresAt");
