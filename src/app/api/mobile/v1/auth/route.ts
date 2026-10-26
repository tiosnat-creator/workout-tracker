import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { digest, mobileIdentity, publicMobileUser } from '@/lib/mobile/auth';
import { json, readJson } from '@/lib/mobile/http';
import { ValidationError } from '../../../../../../packages/shared/mobile';
export const runtime = 'nodejs';
// A valid dummy hash keeps unknown-account checks on the same bcrypt path.
const dummyHash = bcrypt.hashSync('not-a-user-password', 10);
export async function POST(request: Request) {
  try {
    if (process.env.MOBILE_PASSWORD_LOGIN !== 'true') return json({ error: 'Use email-link sign-in for this server.' }, 400);
    const input = await readJson(request, 4096) as { email?: unknown; password?: unknown } | null;
    if (!input || typeof input.email !== 'string' || typeof input.password !== 'string' ||
        input.email.length > 254 || !input.email.trim() || input.password.length > 256 || !input.password) {
      return json({ error: 'Enter your email and password.' }, 400);
    }
    const email = input.email.trim();
    // Database-backed and atomic across Upsun instances. Never trust caller-supplied IP headers.
    const key = digest(email.toLowerCase());
    const limits = await prisma.$queryRaw<{ attempts: number }[]>`
      INSERT INTO "MobileLoginLimit" ("key", "attempts", "resetAt")
      VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "MobileLoginLimit"."resetAt" <= NOW() THEN 1 ELSE "MobileLoginLimit"."attempts" + 1 END,
        "resetAt" = CASE WHEN "MobileLoginLimit"."resetAt" <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "MobileLoginLimit"."resetAt" END
      RETURNING "attempts"`;
    if (limits[0].attempts > 10) return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(input.password, user?.passwordHash ?? dummyHash);
    if (!user || user.disabledAt || !valid) return json({ error: 'Invalid email or password.' }, 401);
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.mobileToken.create({ data: { digest: digest(token), userId: user.id, expiresAt } });
    return json({ token, expiresAt, user: publicMobileUser(user) });
  } catch (error) {
    if (error instanceof ValidationError) return json({ error: error.message }, 400);
    console.error('Mobile login failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Sign-in is temporarily unavailable.' }, 503);
  }
}
export async function DELETE(request: Request) {
  const identity = await mobileIdentity(request);
  if (identity) await prisma.mobileToken.deleteMany({ where: { digest: identity.digest } });
  return json({ ok: true });
}
