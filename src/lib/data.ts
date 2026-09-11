import { prisma } from "@/lib/prisma";
import { estimateOneRepMax, bestOneRepMax, type OneRepMaxPoint } from "@/lib/oneRepMax";

export async function getLifts(userId: string, includeArchived = false) {
  return prisma.lift.findMany({
    where: { userId, ...(includeArchived ? {} : { archived: false }) },
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getLift(liftId: string, userId: string) {
  return prisma.lift.findFirst({
    where: { id: liftId, userId },
    include: { category: true },
  });
}

export async function getCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCategoriesWithLiftCounts(userId: string) {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { lifts: true } } },
  });
  return categories;
}

async function oneRepMaxPointsForLift(liftId: string, userId: string) {
  const [manualEntries, setEntries] = await Promise.all([
    prisma.oneRepMaxEntry.findMany({
      where: { liftId, userId },
      orderBy: { date: "asc" },
    }),
    prisma.setEntry.findMany({
      where: { liftId, session: { userId } },
      include: { session: true },
    }),
  ]);

  const manualPoints: OneRepMaxPoint[] = manualEntries.map((entry) => ({
    date: entry.date,
    weight: entry.weight,
    source: "MANUAL",
  }));

  const bestEstimatedBySession = new Map<string, OneRepMaxPoint>();
  for (const set of setEntries) {
    const estimated = estimateOneRepMax(set.weight, set.reps);
    const existing = bestEstimatedBySession.get(set.sessionId);
    if (!existing || estimated > existing.weight) {
      bestEstimatedBySession.set(set.sessionId, {
        date: set.session.date,
        weight: Math.round(estimated * 10) / 10,
        source: "ESTIMATED",
      });
    }
  }

  const points = [...manualPoints, ...bestEstimatedBySession.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  return points;
}

export async function getLiftDetail(liftId: string, userId: string) {
  const lift = await getLift(liftId, userId);
  if (!lift) return null;

  const points = await oneRepMaxPointsForLift(liftId, userId);
  const current = bestOneRepMax(points);

  const recentSets = await prisma.setEntry.findMany({
    where: { liftId, session: { userId } },
    include: { session: true },
    orderBy: { session: { date: "desc" } },
    take: 50,
  });

  const manualEntries = await prisma.oneRepMaxEntry.findMany({
    where: { liftId, userId },
    orderBy: { date: "desc" },
  });

  return { lift, points, current, recentSets, manualEntries };
}

export async function getCurrentOneRepMaxes(userId: string) {
  const lifts = await getLifts(userId);
  const results = await Promise.all(
    lifts.map(async (lift) => {
      const points = await oneRepMaxPointsForLift(lift.id, userId);
      return { lift, current: bestOneRepMax(points) };
    }),
  );
  results.sort((a, b) => a.lift.dashboardOrder - b.lift.dashboardOrder);
  return results;
}

export async function getDashboardBoard(userId: string) {
  const [categories, oneRepMaxes] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: { dashboardOrder: "asc" },
    }),
    getCurrentOneRepMaxes(userId),
  ]);

  const tilesByCategory = new Map<string, typeof oneRepMaxes>();
  for (const tile of oneRepMaxes) {
    const list = tilesByCategory.get(tile.lift.categoryId) ?? [];
    list.push(tile);
    tilesByCategory.set(tile.lift.categoryId, list);
  }

  return categories
    .map((category) => ({
      category,
      tiles: tilesByCategory.get(category.id) ?? [],
    }))
    .filter((group) => group.tiles.length > 0);
}

export async function getSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    include: { setEntries: { include: { lift: true } } },
    orderBy: { date: "desc" },
  });
}

export async function getSessionDetail(sessionId: string, userId: string) {
  return prisma.session.findFirst({
    where: { id: sessionId, userId },
    include: {
      setEntries: { include: { lift: true }, orderBy: { order: "asc" } },
    },
  });
}
