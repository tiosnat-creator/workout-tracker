import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function mobileIdentity(request: Request) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization') ?? '');
  if (!match) return null;
  const token = await prisma.mobileToken.findUnique({ where: { digest: digest(match[1]) }, include: { user: true } });
  if (!token || token.expiresAt <= new Date()) return null;
  return { digest: token.digest, user: token.user };
}
