import type { Prisma } from '@prisma/client';
import { parseEntity, type ChangeMutation } from '../../../packages/shared/mobile';
export class ChangeConflict extends Error {}
/** Serializable transaction + content comparison protects edits made by the web UI too. */
export async function applyChange(tx: Prisma.TransactionClient, userId: string, change: ChangeMutation) {
  const { entity, id, before, after } = change;
  const current = entity === 'lifts' ? await tx.lift.findFirst({ where: { id, userId } })
    : entity === 'categories' ? await tx.category.findFirst({ where: { id, userId } })
    : entity === 'bodyWeights' ? await tx.bodyWeightEntry.findFirst({ where: { id, userId } })
    : await tx.session.findFirst({ where: { id, userId }, include: { setEntries: { orderBy: { order: 'asc' } } } });
  const serialized = current ? JSON.parse(JSON.stringify(current)) : null;
  if (JSON.stringify(serialized ? parseEntity(entity, serialized) : null) !== JSON.stringify(before)) {
    throw new ChangeConflict('This entry changed on the website. Review the saved change in Account & sync.');
  }
  if (entity === 'lifts') {
    if (!after) throw new ChangeConflict('Archive lifts instead of deleting them.');
    if (!await tx.category.findFirst({ where: { id: after.categoryId, userId } })) throw new ChangeConflict('The selected category is no longer available.');
    if (before) await tx.lift.update({ where: { id }, data: after });
    else await tx.lift.create({ data: { ...after, userId } });
  } else if (entity === 'categories') {
    if (before?.isUncategorized && (!after || after.name !== before.name || !after.isUncategorized)) throw new ChangeConflict('The Uncategorized category cannot be renamed or deleted.');
    if (after && !!after.isUncategorized !== !!before?.isUncategorized) throw new ChangeConflict('The default category cannot be changed.');
    if (!after) {
      const fallback = await tx.category.findFirst({ where: { userId, isUncategorized: true } });
      if (!fallback) throw new ChangeConflict('The default category is unavailable.');
      await tx.lift.updateMany({ where: { categoryId: id, userId }, data: { categoryId: fallback.id } });
      await tx.category.delete({ where: { id } });
    } else if (before) await tx.category.update({ where: { id }, data: after });
    else await tx.category.create({ data: { ...after, userId } });
  } else if (entity === 'bodyWeights') {
    if (!after) await tx.bodyWeightEntry.delete({ where: { id } });
    else if (before) await tx.bodyWeightEntry.update({ where: { id }, data: { ...after, date: new Date(after.date) } });
    else await tx.bodyWeightEntry.create({ data: { ...after, userId, date: new Date(after.date) } });
  } else {
    if (!after) { await tx.session.delete({ where: { id } }); return; }
    const liftIds = [...new Set(after.setEntries.map((s) => s.liftId))];
    if (await tx.lift.count({ where: { id: { in: liftIds }, userId } }) !== liftIds.length) throw new ChangeConflict('A lift is no longer available.');
    const data = { date: new Date(after.date), notes: after.notes, setEntries: { create: after.setEntries.map((set, order) => ({ ...set, order })) } };
    if (before) {
      await tx.setEntry.deleteMany({ where: { sessionId: id } });
      await tx.session.update({ where: { id }, data });
    } else await tx.session.create({ data: { ...data, id, userId } });
  }
}
