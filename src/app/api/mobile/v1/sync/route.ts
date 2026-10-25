import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { digest, mobileIdentity } from '@/lib/mobile/auth';
import { json, readJson } from '@/lib/mobile/http';
import { parseMutation, ValidationError } from '../../../../../../packages/shared/mobile';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const identity = await mobileIdentity(request);
  if (!identity) return json({ error: 'Sign in again to sync. Your offline workouts are safe.' }, 401);
  const { user } = identity;
  const snapshot = await prisma.$transaction(async (tx) => ({
    user: { id: user.id, email: user.email, name: user.name },
    categories: await tx.category.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    lifts: await tx.lift.findMany({ where: { userId: user.id }, select: { id: true, name: true, categoryId: true, archived: true } }),
    sessions: await tx.session.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' },
      select: { id: true, date: true, notes: true, setEntries: { orderBy: { order: 'asc' }, select: { liftId: true, weight: true, reps: true, rpe: true, notes: true } } } }),
  }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return json(snapshot);
}
export async function POST(request: Request) {
  const identity = await mobileIdentity(request);
  if (!identity) return json({ error: 'Sign in again to sync. Your offline workouts are safe.' }, 401);
  const userId = identity.user.id;
  try {
    const mutation = parseMutation(await readJson(request));
    const payloadHash = digest(JSON.stringify(mutation));
    const result = await prisma.$transaction(async (tx) => {
      // Serialize retries for this account and mutation, including simultaneous requests.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ':' + mutation.mutationId}, 0))::text`;
      const previous = await tx.mobileReceipt.findUnique({ where: { userId_mutationId: { userId, mutationId: mutation.mutationId } } });
      if (previous) return previous.payloadHash === payloadHash ? 'accepted' : 'conflict';
      const liftIds = [...new Set(mutation.workout.setEntries.map((s) => s.liftId))];
      const count = await tx.lift.count({ where: { id: { in: liftIds }, userId } });
      if (count !== liftIds.length) return 'missing-lift';
      const existing = await tx.session.findUnique({ where: { id: mutation.workout.id }, select: { id: true } });
      if (existing) return 'conflict';
      await tx.session.create({ data: {
        id: mutation.workout.id, userId, date: new Date(mutation.workout.date), notes: mutation.workout.notes,
        setEntries: { create: mutation.workout.setEntries.map((s, order) => ({ ...s, order })) },
      } });
      await tx.mobileReceipt.create({ data: { userId, mutationId: mutation.mutationId, payloadHash } });
      return 'accepted';
    });
    if (result !== 'accepted') return json({ error: result === 'missing-lift' ? 'A lift is no longer available. Your workout remains on this phone.' : 'This workout conflicts with a previous upload. Your local copy has been kept.' }, 409);
    revalidatePath('/'); revalidatePath('/sessions'); revalidatePath('/lifts');
    for (const s of mutation.workout.setEntries) revalidatePath(`/lifts/${s.liftId}`);
    return json({ acknowledged: mutation.mutationId });
  } catch (error) {
    if (error instanceof ValidationError) return json({ error: error.message }, 400);
    console.error('Mobile sync failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Sync temporarily failed. Your workout is saved on this phone; retry shortly.' }, 503);
  }
}
