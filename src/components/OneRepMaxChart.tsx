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

export type ChartPoint = {
  date: string;
  weight: number;
  source: "MANUAL" | "ESTIMATED";
};

const ACCENT = "#d9480f";
const GRID = "#e5e5e5";
const MUTED = "#6b7280";

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  const isManual = payload.source === "MANUAL";
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={isManual ? ACCENT : "#fff"}
      stroke={ACCENT}
      strokeWidth={2}
    />
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
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
      <p className="text-muted">
        {point.source === "MANUAL" ? "Manual test" : "From session"}
      </p>
    </div>
  );
}

export function OneRepMaxChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted">
        No 1RM data yet — log a set or add a manual test below.
      </p>
    );
  }

  return (
    <div>
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
              dot={<CustomDot />}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: ACCENT }}
          />
          Manual test
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border-2"
            style={{ borderColor: ACCENT }}
          />
          From session
        </span>
      </div>
    </div>
  );
}
