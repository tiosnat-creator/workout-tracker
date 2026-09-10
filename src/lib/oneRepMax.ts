export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export function percentageTable(
  oneRepMax: number,
  step = 5,
  from = 50,
  to = 100,
) {
  const rows: { percent: number; weight: number }[] = [];
  for (let percent = from; percent <= to; percent += step) {
    rows.push({ percent, weight: Math.round((oneRepMax * percent) / 100) });
  }
  return rows;
}

export type OneRepMaxPoint = {
  date: Date;
  weight: number;
  source: "MANUAL" | "ESTIMATED";
};

export function bestOneRepMax(points: OneRepMaxPoint[]): OneRepMaxPoint | null {
  if (points.length === 0) return null;
  return points.reduce((best, point) =>
    point.weight > best.weight ? point : best,
  );
}
