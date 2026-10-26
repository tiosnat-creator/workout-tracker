import { createHmac, randomBytes } from 'node:crypto';
import { authOrigin } from '@/lib/auth-origin';
import { admitAuthRequest } from '@/lib/auth-rate-limit';
import { prisma } from '@/lib/prisma';
import { hashEmail } from '@/lib/email-crypto';
import { sendMagicLinkEmail, isMagicLinkEmailConfigured } from '@/lib/mail';
import { digest, publicMobileUser } from '@/lib/mobile/auth';
import { json, readJson } from '@/lib/mobile/http';
import { ValidationError } from '../../../../../../packages/shared/mobile';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const input = await readJson(request, 4096) as Record<string, unknown>;
    if (!input || typeof input !== 'object') throw new ValidationError('Invalid request.');
    if (input.action === 'confirm') {
      if (typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token)) throw new ValidationError('Invalid sign-in link.');
      const confirmed = await prisma.mobileMagicChallenge.updateMany({ where: { tokenHash: digest(input.token), confirmedAt: null, expiresAt: { gt: new Date() } }, data: { confirmedAt: new Date() } });
      return confirmed.count ? json({ ok: true }) : json({ error: 'This link has expired or was already confirmed. Return to the app or request a new link.' }, 400);
    }
    if (typeof input.verifier !== 'string' || !/^[a-f0-9-]{64,128}$/.test(input.verifier)) throw new ValidationError('Invalid device request.');
    if (input.action === 'request') {
      if (!isMagicLinkEmailConfigured()) return json({ error: 'Email sign-in is not configured on this server.' }, 503);
      const origin = authOrigin();
      if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) throw new ValidationError('Enter a valid email address.');
      const emailHash = hashEmail(input.email);
      const id = randomBytes(24).toString('hex'), token = randomBytes(32).toString('hex');
      const response = { id, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
      // An opaque response preserves account privacy without persisting rejected requests.
      if (!await admitAuthRequest(`mobile-magic:${emailHash}`, 3, 900)) return json(response);
      const user = await prisma.user.findUnique({ where: { emailHash } });
      // Same response for unknown, disabled and rate-limited accounts.
      const eligible = user && !user.disabledAt && !!user.onboardingCompletedAt;
      await prisma.mobileMagicChallenge.create({ data: { id, tokenHash: digest(token), verifierHash: digest(input.verifier), userId: eligible ? user.id : null, expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
      if (eligible) {
        try { await sendMagicLinkEmail(input.email.trim(), `${origin}/login/mobile#token=${token}`); }
        catch { await prisma.mobileMagicChallenge.delete({ where: { id } }); return json({ error: 'Could not send the sign-in email. Try again later.' }, 503); }
      }
      return json(response);
    }
    if (input.action !== 'claim' || typeof input.id !== 'string' || !/^[a-f0-9]{48}$/.test(input.id)) throw new ValidationError('Invalid sign-in request.');
    const challenge = await prisma.mobileMagicChallenge.findUnique({ where: { id: input.id } });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.verifierHash !== digest(input.verifier)) return json({ error: 'Sign-in expired. Request a new email link.' }, 401);
    if (!challenge.confirmedAt || !challenge.userId) return json({ pending: true });
    const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!user || user.disabledAt || !user.onboardingCompletedAt) return json({ error: 'This account is unavailable. Complete sign-up on the website first.' }, 401);
    // Stable only for this challenge/device, allowing a lost network response to retry.
    const token = createHmac('sha256', process.env.EMAIL_HMAC_KEY!).update(`mobile:${challenge.id}:${input.verifier}`).digest('hex');
    const expiresAt = new Date(challenge.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.mobileMagicChallenge.updateMany({ where: { id: challenge.id, claimedAt: null }, data: { claimedAt: new Date() } });
      if (claimed.count) {
        await tx.mobileToken.create({ data: { digest: digest(token), userId: user.id, expiresAt } });
        await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      }
    });
    if (!await prisma.mobileToken.findUnique({ where: { digest: digest(token) } })) return json({ error: 'Sign-in was revoked. Request a new email.' }, 401);
    return json({ token, expiresAt, user: publicMobileUser(user) });
  } catch (error) {
    if (error instanceof ValidationError) return json({ error: error.message }, 400);
    console.error('Mobile email sign-in failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Email sign-in is temporarily unavailable.' }, 503);
  }
}
