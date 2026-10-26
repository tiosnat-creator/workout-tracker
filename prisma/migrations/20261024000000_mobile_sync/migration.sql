CREATE TABLE "MobileToken" (
  "digest" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MobileToken_userId_idx" ON "MobileToken"("userId");
CREATE TABLE "MobileReceipt" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "mutationId" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "mutationId")
);
CREATE TABLE "MobileLoginLimit" (
  "key" TEXT PRIMARY KEY,
  "attempts" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL
);
