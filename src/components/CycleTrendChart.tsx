"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CyclePhase, CyclePhasePoint, CycleLengthPoint } from "@/lib/prediction";

const AXIS_PROPS = {
  stroke: "var(--color-wine)",
  fontSize: 11,
  tickLine: false,
} as const;

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--color-wine)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600 },
} as const;

function formatDateTick(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export type PersonPhaseSeries = {
  id: string;
  name: string;
  color: string;
  points: CyclePhasePoint[];
};

const PHASE_TICK_LABEL: Record<number, string> = {
  0: "Menstruation",
  1: "Ovulation",
};

const PHASE_NAME: Record<CyclePhase, string> = {
  menstrual: "Menstruation",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
};

type PhaseTooltipRow = { name: string; color: string; phase: CyclePhase; predicted: boolean };

function PhaseTooltipContent({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey?: string | number; payload?: Record<string, unknown> }[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const rows: PhaseTooltipRow[] = payload
    .map((entry) => {
      const key = String(entry.dataKey ?? "");
      const row = entry.payload ?? {};
      const phase = row[`${key}__phase`] as CyclePhase | undefined;
      if (!phase) return null;
      return {
        name: String(row[`${key}__name`] ?? key),
        color: String(row[`${key}__color`] ?? "var(--color-wine)"),
        phase,
        predicted: Boolean(row[`${key}__predicted`]),
      };
    })
    .filter((r): r is PhaseTooltipRow => r !== null);

  if (rows.length === 0) return null;

  return (
    <div
      style={TOOLTIP_STYLE.contentStyle}
      className="flex flex-col gap-1 bg-surface! px-3 py-2"
    >
      <p style={TOOLTIP_STYLE.labelStyle}>{formatDateTick(String(label))}</p>
      {rows.map((row) => (
        <p key={row.name} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          {row.name} — {PHASE_NAME[row.phase]}
          {row.predicted ? " (est.)" : ""}
        </p>
      ))}
    </div>
  );
}

/**
 * The combined cycle-phase chart — one hill per cycle per person, floored at
 * menstruation and peaking at ovulation, so it's possible to see at a glance
 * where everyone currently is in their cycle and hover for the phase name.
 * See Design.md / Project.md §4.4.
 */
export function CyclePhaseProgressionChart({ series }: { series: PersonPhaseSeries[] }) {
  const dateSet = new Set<string>();
  const byPersonByDate = new Map<string, Map<string, CyclePhasePoint>>();
  for (const s of series) {
    const map = new Map<string, CyclePhasePoint>();
    for (const point of s.points) {
      dateSet.add(point.date);
      map.set(point.date, point);
    }
    byPersonByDate.set(s.id, map);
  }

  const dates = Array.from(dateSet).sort();
  const rows = dates.map((date) => {
    const row: Record<string, string | number | boolean> = { date };
    for (const s of series) {
      const point = byPersonByDate.get(s.id)?.get(date);
      if (point !== undefined) {
        row[s.id] = point.height;
        row[`${s.id}__phase`] = point.phase;
        row[`${s.id}__predicted`] = point.predicted;
        row[`${s.id}__name`] = s.name;
        row[`${s.id}__color`] = s.color;
      }
    }
    return row;
  });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-foreground/50">
        Log at least one cycle to see the combined trend.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-blush)" strokeOpacity={0.4} vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDateTick} {...AXIS_PROPS} />
        <YAxis
          {...AXIS_PROPS}
          domain={[0, 1]}
          ticks={[0, 1]}
          tickFormatter={(value) => PHASE_TICK_LABEL[value as number] ?? ""}
          width={90}
        />
        <Tooltip content={<PhaseTooltipContent />} />
        <Legend
          formatter={(value) => series.find((s) => s.id === value)?.name ?? value}
          wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }}
        />
        {series.map((s) => (
          <Line
            key={s.id}
            type="monotone"
            dataKey={s.id}
            name={s.id}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Per-person regularity over time — how consistent their logged cycle lengths have been. */
export function CycleLengthTrendChart({
  name,
  color,
  points,
  defaultCycleLength,
}: {
  name: string;
  color: string;
  points: CycleLengthPoint[];
  defaultCycleLength: number;
}) {
  if (points.length < 2) {
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-wine/10 bg-card/50 p-4">
        <p className="font-display text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-foreground/50">
          Needs at least two logged cycles to show a trend.
        </p>
      </div>
    );
  }

  const rows = points.map((p) => ({ startDate: p.startDate, length: p.length }));

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-wine/10 bg-card/50 p-4">
      <p className="font-display text-sm font-medium text-foreground">{name}</p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-blush)" strokeOpacity={0.4} vertical={false} />
          <XAxis dataKey="startDate" tickFormatter={formatDateTick} {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={28} domain={["dataMin - 2", "dataMax + 2"]} />
          <Tooltip
            labelFormatter={(label) => formatDateTick(String(label))}
            formatter={(value) => [`${value} days`, "Cycle length"]}
            {...TOOLTIP_STYLE}
          />
          <Line
            type="monotone"
            dataKey="length"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-foreground/50">Default: {defaultCycleLength} days</p>
    </div>
  );
}
