import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

async function increment(tx: Prisma.TransactionClient, key: string, limit: number, seconds: number) {
  const rows = await tx.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "MobileLoginLimit" ("key", "attempts", "resetAt")
    VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "MobileLoginLimit"."resetAt" <= NOW() THEN 1 ELSE LEAST("MobileLoginLimit"."attempts" + 1, ${limit + 1}) END,
      "resetAt" = CASE WHEN "MobileLoginLimit"."resetAt" <= NOW() THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE "MobileLoginLimit"."resetAt" END
    RETURNING "attempts"`;
  return rows[0].attempts;
}

// Shared across instances and authentication entry points. The global row is
// acquired first, bounding per-address rows even when an attacker rotates emails.
// No caller-controlled IP headers are trusted. Counters survive token consumption.
export async function admitAuthRequest(key: string, limit: number, seconds: number): Promise<boolean> {
  return prisma.$transaction(async tx => {
    const global = await increment(tx, 'auth:global', 1000, 3600);
    if (global > 1000) return false;
    if (global === 1) {
      // Once per global window, under its row lock, rather than on every request.
      await tx.mobileLoginLimit.deleteMany({ where: { resetAt: { lte: new Date() } } });
      await tx.mobileMagicChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      await tx.magicLinkToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    }
    return await increment(tx, key, limit, seconds) <= limit;
  });
}
