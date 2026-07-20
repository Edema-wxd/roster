"use client";

import { useMemo, useRef, useState } from "react";
import type { CyclePhase } from "@/lib/prediction";

export type RibbonDay = { date: string; phase: CyclePhase; predicted: boolean };
export type RibbonPartner = { id: string; name: string; color: string; days: RibbonDay[] };

const LABEL_COL = 84; // px, the partner-name column
const AXIS_H = 22; // px, month-tick row under the lanes
const ROW_H = 30; // px, one partner lane
const ROW_GAP = 12; // px

type PeriodBand = { startIdx: number; endIdx: number; predicted: boolean };
type FertileMark = { idx: number };

function formatDay(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function statusLabel(day: RibbonDay | undefined): string {
  if (!day) return "-";
  switch (day.phase) {
    case "menstrual":
      return day.predicted ? "Period (expected)" : "Period";
    case "ovulation":
      return "Fertile window";
    default:
      return "-";
  }
}

export function CycleRibbon({
  dates,
  todayKey,
  partners,
}: {
  dates: string[];
  todayKey: string;
  partners: RibbonPartner[];
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const n = dates.length;

  const dateIndex = useMemo(() => {
    const m = new Map<string, number>();
    dates.forEach((d, i) => m.set(d, i));
    return m;
  }, [dates]);

  const todayIdx = dateIndex.get(todayKey) ?? Math.floor(n / 2);

  // Per-partner lookup + derived period bands and fertile marks.
  const derived = useMemo(() => {
    return partners.map((p) => {
      const byDate = new Map(p.days.map((d) => [d.date, d]));
      const bands: PeriodBand[] = [];
      const fertile: FertileMark[] = [];
      let run: PeriodBand | null = null;
      let ovStart: number | null = null;
      let ovPrev: number | null = null;

      for (let i = 0; i < n; i++) {
        const day = byDate.get(dates[i]);
        // period runs
        if (day?.phase === "menstrual") {
          if (run && run.predicted === day.predicted && run.endIdx === i - 1) run.endIdx = i;
          else {
            if (run) bands.push(run);
            run = { startIdx: i, endIdx: i, predicted: day.predicted };
          }
        } else if (run) {
          bands.push(run);
          run = null;
        }
        // fertile windows → one mark at each window's center
        if (day?.phase === "ovulation") {
          if (ovStart === null) ovStart = i;
          ovPrev = i;
        } else if (ovStart !== null && ovPrev !== null) {
          fertile.push({ idx: Math.round((ovStart + ovPrev) / 2) });
          ovStart = null;
          ovPrev = null;
        }
      }
      if (run) bands.push(run);
      if (ovStart !== null && ovPrev !== null) fertile.push({ idx: Math.round((ovStart + ovPrev) / 2) });

      return { partner: p, byDate, bands, fertile };
    });
  }, [partners, dates, n]);

  const monthTicks = useMemo(() => {
    const ticks: { idx: number; label: string }[] = [];
    let prevMonth = -1;
    dates.forEach((d, i) => {
      const month = Number(d.slice(5, 7));
      if (month !== prevMonth) {
        ticks.push({
          idx: i,
          label: new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short" }),
        });
        prevMonth = month;
      }
    });
    return ticks;
  }, [dates]);

  const pct = (idx: number) => `${(idx / n) * 100}%`;
  const slotW = `${(1 / n) * 100}%`;

  function handleMove(e: React.MouseEvent) {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(n - 1, Math.floor(frac * n)));
    setHoverIdx(idx);
  }

  const plotHeight = partners.length * ROW_H + Math.max(0, partners.length - 1) * ROW_GAP;
  const hoverLeftPct = hoverIdx !== null ? (hoverIdx + 0.5) / n : 0;
  const tooltipOnRight = hoverLeftPct < 0.6;

  return (
    <div className="flex flex-col gap-3">
      {/* Timeline is inherently wide; let it scroll inside its own container on
          narrow screens rather than compressing the marks into dots. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="relative min-w-140">
          {/* rows */}
        <div className="flex flex-col" style={{ gap: ROW_GAP }}>
          {derived.map(({ partner, bands, fertile }) => (
            <div
              key={partner.id}
              className="grid items-center"
              style={{ gridTemplateColumns: `${LABEL_COL}px 1fr` }}
            >
              <div className="flex items-center gap-1.5 pr-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: partner.color }}
                />
                <span className="truncate font-display text-sm text-foreground">
                  {partner.name}
                </span>
              </div>
              <div
                className="relative rounded-full"
                style={{ height: ROW_H, background: "var(--phase-lane)" }}
              >
                {bands.map((band, i) => {
                  const left = (band.startIdx / n) * 100;
                  const width = ((band.endIdx - band.startIdx + 1) / n) * 100;
                  return (
                    <div
                      key={`b${i}`}
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        minWidth: 7,
                        height: 15,
                        borderRadius: 7,
                        background: band.predicted
                          ? "repeating-linear-gradient(45deg, var(--phase-period) 0 2px, transparent 2px 5px)"
                          : "var(--phase-period)",
                        border: band.predicted
                          ? "1px dashed color-mix(in srgb, var(--phase-period) 70%, transparent)"
                          : "none",
                      }}
                    />
                  );
                })}
                {fertile.map((mark, i) => (
                  <div
                    key={`f${i}`}
                    className="absolute top-1/2"
                    style={{
                      left: pct(mark.idx),
                      width: slotW,
                      transform: "translateY(-50%)",
                    }}
                  >
                    <div
                      className="mx-auto rotate-45 rounded-xs"
                      style={{
                        height: 9,
                        width: 9,
                        background: "var(--phase-fertile)",
                        border: "1.5px solid var(--surface)",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* month axis */}
        <div className="relative" style={{ marginLeft: LABEL_COL, height: AXIS_H }}>
          {monthTicks.map((t) => (
            <span
              key={t.idx}
              className="absolute top-1.5 text-[11px] text-foreground/40"
              style={{ left: pct(t.idx) }}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* today line + hover overlay (over the lane region only) */}
        <div
          ref={overlayRef}
          className="absolute cursor-crosshair"
          style={{ left: LABEL_COL, right: 0, top: 0, height: plotHeight }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* today */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px"
            style={{ left: `${((todayIdx + 0.5) / n) * 100}%`, background: "var(--color-rose)" }}
          >
            <span className="absolute top-0 left-1 text-[10px] font-medium text-accent">
              today
            </span>
          </div>
          {/* hover crosshair + floating tooltip */}
          {hoverIdx !== null && (
            <>
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-foreground/25"
                style={{ left: `${hoverLeftPct * 100}%` }}
              />
              <div
                className="pointer-events-none absolute top-0 z-10 w-max max-w-56 rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs shadow-md"
                style={{
                  left: `${hoverLeftPct * 100}%`,
                  transform: tooltipOnRight
                    ? "translate(10px, 0)"
                    : "translate(calc(-100% - 10px), 0)",
                }}
              >
                <p className="mb-1 font-medium text-foreground">{formatDay(dates[hoverIdx])}</p>
                <div className="flex flex-col gap-0.5">
                  {derived.map(({ partner, byDate }) => (
                    <p key={partner.id} className="flex items-center gap-1.5 text-foreground/70">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: partner.color }}
                      />
                      <span className="text-foreground">{partner.name}</span>
                      <span>· {statusLabel(byDate.get(dates[hoverIdx]))}</span>
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-foreground/60">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-full"
            style={{ background: "var(--phase-period)" }}
          />
          Period
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-full"
            style={{
              background: "repeating-linear-gradient(45deg, var(--phase-period) 0 2px, transparent 2px 5px)",
              border: "1px dashed color-mix(in srgb, var(--phase-period) 70%, transparent)",
            }}
          />
          Expected
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rotate-45 rounded-xs"
            style={{ background: "var(--phase-fertile)" }}
          />
          Fertile window
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-px bg-accent" />
          Today
        </span>
      </div>
    </div>
  );
}
