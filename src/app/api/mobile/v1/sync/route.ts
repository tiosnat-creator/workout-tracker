import { applyChange, ChangeConflict } from '@/lib/mobile/changes';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { digest, mobileIdentity, publicMobileUser } from '@/lib/mobile/auth';
import { json, readJson } from '@/lib/mobile/http';
import { parseMobileMutation, isManualMutation, ValidationError } from '../../../../../../packages/shared/mobile';
export const runtime = 'nodejs';
async function writeTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt >= 2) throw error;
    }
  }
}
export async function GET(request: Request) {
  const identity = await mobileIdentity(request);
  if (!identity) return json({ error: 'Sign in again to sync. Your offline workouts are safe.' }, 401);
  const { user } = identity;
  const snapshot = await prisma.$transaction(async (tx) => ({
    capabilities: ['manual-1rm', 'changes-v1'],
    bodyWeights: await tx.bodyWeightEntry.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }, select: { id: true, weight: true, date: true, notes: true } }),
    user: publicMobileUser(user),
    oneRepMaxes: await tx.oneRepMaxEntry.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }, select: { id: true, liftId: true, weight: true, date: true, notes: true } }),
    categories: await tx.category.findMany({ where: { userId: user.id }, select: { id: true, name: true, isUncategorized: true, dashboardOrder: true } }),
    lifts: await tx.lift.findMany({ where: { userId: user.id }, select: { id: true, name: true, categoryId: true, archived: true, dashboardOrder: true } }),
    sessions: await tx.session.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' },
      select: { id: true, status: true, date: true, notes: true, setEntries: { orderBy: { order: 'asc' }, select: { id: true, plannedExerciseId: true, liftId: true, weight: true, reps: true, rpe: true, notes: true } } } }),
  }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return json(snapshot);
}
export async function POST(request: Request) {
  const identity = await mobileIdentity(request);
  if (!identity) return json({ error: 'Sign in again to sync. Your offline workouts are safe.' }, 401);
  const userId = identity.user.id;
  try {
    const mutation = parseMobileMutation(await readJson(request));
    const payloadHash = digest(JSON.stringify(mutation));
    const result = await writeTransaction(async (tx) => {
      // Serialize retries for this account and mutation, including simultaneous requests.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ':' + mutation.mutationId}, 0))::text`;
      const previous = await tx.mobileReceipt.findUnique({ where: { userId_mutationId: { userId, mutationId: mutation.mutationId } } });
      if (previous) return previous.payloadHash === payloadHash ? 'accepted' : 'conflict';
      if ('kind' in mutation && mutation.kind === 'change') {
        await applyChange(tx, userId, mutation);
        await tx.mobileReceipt.create({ data: { userId, mutationId: mutation.mutationId, payloadHash } });
        return 'accepted';
      }
      const liftIds = isManualMutation(mutation) ? [mutation.entry.liftId] : [...new Set(mutation.workout.setEntries.map((s) => s.liftId))];
      const count = await tx.lift.count({ where: { id: { in: liftIds }, userId } });
      if (count !== liftIds.length) return 'missing-lift';
      if (isManualMutation(mutation)) {
        if (await tx.oneRepMaxEntry.findUnique({ where: { id: mutation.entry.id } })) return 'conflict';
        await tx.oneRepMaxEntry.create({ data: { ...mutation.entry, userId, date: new Date(mutation.entry.date) } });
      } else {
        const existing = await tx.session.findUnique({ where: { id: mutation.workout.id }, select: { id: true } });
        if (existing) return 'conflict';
        await tx.session.create({ data: {
          id: mutation.workout.id, userId, date: new Date(mutation.workout.date), notes: mutation.workout.notes,
          setEntries: { create: mutation.workout.setEntries.map((s, order) => ({ ...s, order })) },
        } });
      }
      await tx.mobileReceipt.create({ data: { userId, mutationId: mutation.mutationId, payloadHash } });
      return 'accepted';
    });
    if (result !== 'accepted') return json({ error: result === 'missing-lift' ? 'A lift is no longer available. Your entry remains on this phone.' : 'This entry conflicts with a previous upload. Your local copy has been kept.' }, 409);
    revalidatePath('/', 'layout');
    return json({ acknowledged: mutation.mutationId });
  } catch (error) {
    if (error instanceof ChangeConflict) return json({ error: error.message }, 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return json({ error: 'An entry with that name or ID already exists. Review your saved change in Account & sync.' }, 409);
    if (error instanceof ValidationError) return json({ error: error.message }, 400);
    console.error('Mobile sync failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Sync temporarily failed. Your entry is saved on this phone; retry shortly.' }, 503);
  }
}
