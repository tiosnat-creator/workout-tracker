"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BodyWeightPoint = {
  date: string;
  weight: number;
};

const ACCENT = "#d9480f";
const GRID = "#e5e5e5";
const MUTED = "#6b7280";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: BodyWeightPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded border border-border bg-surface px-2 py-1 text-xs shadow">
      <p className="font-medium">
        {new Date(point.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
      <p>{point.weight} kg</p>
    </div>
  );
}

export function BodyWeightChart({ points }: { points: BodyWeightPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted">
        No body weight entries yet — add one below.
      </p>
    );
  }

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) =>
              new Date(value).toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
              })
            }
            tick={{ fontSize: 11, fill: MUTED }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
          />
          <YAxis
            domain={["dataMin - 2", "dataMax + 2"]}
            tick={{ fontSize: 11, fill: MUTED }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="weight"
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
