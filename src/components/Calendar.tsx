"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  Clock,
  Droplet,
  Heart,
  Pencil,
  Stethoscope,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  addIntimacyEntry,
  addVisit,
  deleteIntimacyEntry,
  deleteVisit,
  updateVisit,
} from "@/app/(app)/dashboard/actions";
import { addDaysToKey, dateKey, isoToKey, isoToTime } from "@/lib/cycle";
import { computePrediction, phaseForDate, type CyclePhase } from "@/lib/prediction";
import { addCycle } from "@/app/(app)/people/[id]/actions";
import type { VisitStatus } from "@/generated/prisma/enums";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type PersonSummary = {
  id: string;
  name: string;
  color: string;
  cycleTrackingEnabled: boolean;
  defaultCycleLength: number;
  defaultPeriodLength: number;
  defaultLutealPhaseLength: number;
};

// Phase is encoded as a lightness ramp within the brand's wine/rose family
// (not four unrelated hues) so the calendar reads as one system, plus
// filled-vs-hollow as a second channel for legibility independent of hue.
// Person identity is carried separately by the ring/border color (Okabe-Ito
// palette, src/lib/personPalette.ts) — see Design.md §5.
const PHASE_STYLE: Record<CyclePhase, { fill: string; filled: boolean }> = {
  menstrual: { fill: "#773344", filled: true }, // wine
  ovulation: { fill: "#D44D5C", filled: true }, // rose
  luteal: { fill: "#E3B5A4", filled: true }, // blush
  follicular: { fill: "transparent", filled: false },
};

const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: "Period",
  ovulation: "Ovulation (est.)",
  luteal: "Luteal (est.)",
  follicular: "Follicular (est.)",
};

export type CycleSummary = {
  id: string;
  personId: string;
  startDate: string;
  endDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
};

export type VisitSummary = {
  id: string;
  scheduledAt: string;
  type: "CASUAL" | "FORMAL";
  status: VisitStatus;
  notes: string | null;
  people: { id: string; name: string; color: string }[];
};

const STATUS_META: Record<VisitStatus, { label: string; icon: LucideIcon; className: string }> = {
  PLANNED: { label: "Planned", icon: Clock, className: "text-foreground/50" },
  CONFIRMED: { label: "Confirmed", icon: CheckCircle2, className: "text-primary" },
  DONE: { label: "Done", icon: CheckCheck, className: "text-foreground/40" },
  CANCELLED: { label: "Cancelled", icon: XCircle, className: "text-destructive" },
};

export type IntimacySummary = {
  id: string;
  personId: string;
  date: string;
  protected: boolean;
  notes: string | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Shared field styling for the day-detail sidebar's forms — see Design.md §5.
const FIELD_CLASS =
  "rounded-md border border-wine/20 bg-surface px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary";
const EYEBROW_CLASS = "text-[11px] font-medium uppercase tracking-wider text-foreground/50";

function buildMonthMatrix(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { year: number; month: number; day: number; inMonth: boolean }[] = [];

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ year: y, month: m, day, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ year, month, day, inMonth: true });
  }

  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    const next = last.day + 1;
    const overflow = new Date(last.year, last.month, next);
    cells.push({
      year: overflow.getFullYear(),
      month: overflow.getMonth(),
      day: overflow.getDate(),
      inMonth: false,
    });
    if (cells.length >= 42) break;
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

type DayCellData = { year: number; month: number; day: number; inMonth: boolean };

function buildWeekCells(startKey: string): DayCellData[] {
  const cells: DayCellData[] = [];
  let key = startKey;
  for (let i = 0; i < 7; i++) {
    const [y, m, d] = key.split("-").map(Number);
    cells.push({ year: y, month: m - 1, day: d, inMonth: true });
    key = addDaysToKey(key, 1);
  }
  return cells;
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function startOfWeekKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  return addDaysToKey(key, -dayOfWeek);
}

export function Calendar({
  people,
  cycles,
  visits,
  intimacyEntries,
}: {
  people: PersonSummary[];
  cycles: CycleSummary[];
  visits: VisitSummary[];
  intimacyEntries: IntimacySummary[];
}) {
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [weekStartKey, setWeekStartKey] = useState<string>(() => startOfWeekKey(todayKey));
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);
  const [panelMode, setPanelMode] = useState<"visit" | "intimacy" | "cycle" | null>(null);
  const [isPending, startTransition] = useTransition();

  const weeks = useMemo(() => buildMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekCells = useMemo(() => buildWeekCells(weekStartKey), [weekStartKey]);
  const visibleCells = viewMode === "month" ? weeks.flat() : weekCells;

  const cyclesByPerson = useMemo(() => {
    const map = new Map<string, CycleSummary[]>();
    for (const cycle of cycles) {
      const list = map.get(cycle.personId) ?? [];
      list.push(cycle);
      map.set(cycle.personId, list);
    }
    return map;
  }, [cycles]);

  const visitsByKey = useMemo(() => {
    const map = new Map<string, VisitSummary[]>();
    for (const visit of visits) {
      const key = isoToKey(visit.scheduledAt);
      const list = map.get(key) ?? [];
      list.push(visit);
      map.set(key, list);
    }
    return map;
  }, [visits]);

  const intimacyByKey = useMemo(() => {
    const map = new Map<string, IntimacySummary[]>();
    for (const entry of intimacyEntries) {
      const key = isoToKey(entry.date);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [intimacyEntries]);

  const predictionByPerson = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computePrediction>>();
    for (const person of people) {
      if (!person.cycleTrackingEnabled) continue;
      const personCycles = cyclesByPerson.get(person.id) ?? [];
      map.set(
        person.id,
        computePrediction(
          personCycles,
          person.defaultCycleLength,
          person.defaultPeriodLength,
          person.defaultLutealPhaseLength,
        ),
      );
    }
    return map;
  }, [people, cyclesByPerson]);

  function phaseStatusForKey(
    person: PersonSummary,
    key: string,
  ): { phase: CyclePhase; predicted: boolean } | null {
    if (!person.cycleTrackingEnabled) return null;
    const personCycles = cyclesByPerson.get(person.id) ?? [];
    const prediction = predictionByPerson.get(person.id) ?? null;
    return phaseForDate(personCycles, prediction, person.defaultPeriodLength, key);
  }

  // Awareness flag (Project.md §4.5): people in a visit whose logged or
  // predicted period overlaps the visit's day, so a planned visit doesn't
  // silently land on someone's period.
  function menstrualPeopleOnKey(candidates: PersonSummary[], key: string): PersonSummary[] {
    return candidates.filter((p) => phaseStatusForKey(p, key)?.phase === "menstrual");
  }

  function visitConflicts(visit: VisitSummary, key: string): PersonSummary[] {
    const visitPeople = visit.people
      .map((vp) => people.find((p) => p.id === vp.id))
      .filter((p): p is PersonSummary => !!p);
    return menstrualPeopleOnKey(visitPeople, key);
  }

  const selectedVisits = visitsByKey.get(selectedKey) ?? [];
  const selectedIntimacy = intimacyByKey.get(selectedKey) ?? [];
  const menstrualIdsToday = new Set(menstrualPeopleOnKey(people, selectedKey).map((p) => p.id));

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToWeek(delta: number) {
    setWeekStartKey((prev) => addDaysToKey(prev, delta * 7));
  }

  function switchToMonth() {
    const [y, m] = selectedKey.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setViewMode("month");
  }

  function switchToWeek() {
    setWeekStartKey(startOfWeekKey(selectedKey));
    setViewMode("week");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col rounded-2xl bg-card/50 p-4 lg:basis-3/4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (viewMode === "month" ? goToMonth(-1) : goToWeek(-1))}
            className="rounded-full px-3 py-1 text-lg text-foreground/70 hover:bg-blush/40"
          >
            ‹
          </button>
          <h2 className="font-display text-xl font-semibold text-primary">
            {viewMode === "month" ? (
              new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })
            ) : (
              <>
                {new Date(`${weekStartKey}T00:00:00`).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                {" – "}
                {new Date(`${addDaysToKey(weekStartKey, 6)}T00:00:00`).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </>
            )}
          </h2>
          <button
            type="button"
            onClick={() => (viewMode === "month" ? goToMonth(1) : goToWeek(1))}
            className="rounded-full px-3 py-1 text-lg text-foreground/70 hover:bg-blush/40"
          >
            ›
          </button>
        </div>

        <div className="mb-3 flex gap-1 self-start rounded-full border border-wine/15 bg-surface/50 p-1 text-xs">
          <button
            type="button"
            onClick={switchToMonth}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              viewMode === "month"
                ? "bg-primary text-cream"
                : "text-foreground/60 hover:text-primary"
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={switchToWeek}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              viewMode === "week"
                ? "bg-primary text-cream"
                : "text-foreground/60 hover:text-primary"
            }`}
          >
            Week
          </button>
        </div>

        {people.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-foreground/70">
            {people.map((p) => (
              <span key={p.id} className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-display">{p.name}</span>
                {!p.cycleTrackingEnabled && (
                  <span className="text-foreground/40">(not tracked)</span>
                )}
              </span>
            ))}
          </div>
        )}
        {people.some((p) => p.cycleTrackingEnabled) && (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-foreground/50">
            {(Object.keys(PHASE_LABEL) as CyclePhase[]).map((phase) => (
              <span key={phase} className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-wine/40"
                  style={{ backgroundColor: PHASE_STYLE[phase].fill }}
                />
                {PHASE_LABEL[phase]}
              </span>
            ))}
            <span className="flex items-center gap-1 border-l border-wine/15 pl-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed border-foreground/40" />
              estimated
            </span>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-foreground/60">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7 gap-1">
          {visibleCells.map((cell) => {
            const key = dateKey(cell.year, cell.month, cell.day);
            const isSelected = key === selectedKey;
            const dayVisits = visitsByKey.get(key) ?? [];
            const dayIntimacy = intimacyByKey.get(key) ?? [];

            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`flex ${viewMode === "week" ? "min-h-32" : "min-h-20"} flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-surface"
                    : "border-transparent bg-surface/40 hover:bg-surface/70"
                } ${!cell.inMonth ? "opacity-40" : ""}`}
              >
                <span className="font-display text-sm font-medium text-foreground/80">
                  {cell.day}
                </span>
                <div className="flex flex-wrap gap-1">
                  {people.map((p) => {
                    const status = phaseStatusForKey(p, key);
                    if (!status) return null;
                    const style = PHASE_STYLE[status.phase];
                    return (
                      <span
                        key={p.id}
                        title={`${p.name} — ${PHASE_LABEL[status.phase]}${status.predicted ? " (estimated)" : ""}`}
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: style.filled ? style.fill : "var(--color-cream)",
                          border: `2px ${status.predicted ? "dashed" : "solid"} ${p.color}`,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {dayVisits.length > 0 && (
                    <CalendarDays
                      className={`h-3 w-3 ${
                        dayVisits.every((v) => v.status === "CANCELLED")
                          ? "text-foreground/30"
                          : "text-foreground/70"
                      }`}
                      aria-label="Visit scheduled"
                    />
                  )}
                  {dayIntimacy.length > 0 && (
                    <Heart className="h-3 w-3 fill-accent text-accent" aria-label="Intimacy logged" />
                  )}
                  {dayVisits.some((v) => visitConflicts(v, key).length > 0) && (
                    <AlertTriangle
                      className="h-3 w-3 text-destructive"
                      aria-label="Visit may land on a period day"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-wine/10 bg-card/50 p-4 lg:basis-1/4">
        <div className="flex items-baseline gap-3 border-b border-wine/15 pb-3">
          <span className="font-display text-4xl font-semibold leading-none text-primary">
            {new Date(`${selectedKey}T00:00:00`).getDate()}
          </span>
          <div className="flex flex-col leading-tight">
            <span className={EYEBROW_CLASS}>
              {new Date(`${selectedKey}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
              })}
            </span>
            <span className="text-sm text-foreground/70">
              {new Date(`${selectedKey}T00:00:00`).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="flex gap-1 rounded-full border border-wine/15 bg-surface/50 p-1">
          <button
            type="button"
            onClick={() => setPanelMode(panelMode === "visit" ? null : "visit")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors ${
              panelMode === "visit"
                ? "bg-primary text-cream"
                : "text-foreground/60 hover:text-primary"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Visit
          </button>
          <button
            type="button"
            onClick={() => setPanelMode(panelMode === "intimacy" ? null : "intimacy")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors ${
              panelMode === "intimacy"
                ? "bg-primary text-cream"
                : "text-foreground/60 hover:text-primary"
            }`}
          >
            <Heart className="h-3.5 w-3.5" /> Intimacy
          </button>
          {people.some((p) => p.cycleTrackingEnabled) && (
            <button
              type="button"
              onClick={() => setPanelMode(panelMode === "cycle" ? null : "cycle")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors ${
                panelMode === "cycle"
                  ? "bg-primary text-cream"
                  : "text-foreground/60 hover:text-primary"
              }`}
            >
              <Droplet className="h-3.5 w-3.5" /> Cycle
            </button>
          )}
        </div>

        {panelMode === "visit" && (
          <VisitForm
            people={people}
            selectedKey={selectedKey}
            conflictPersonIds={menstrualIdsToday}
            onSubmit={(input) => {
              startTransition(async () => {
                await addVisit(input);
                setPanelMode(null);
              });
            }}
          />
        )}

        {panelMode === "cycle" && (
          <CycleForm
            people={people.filter((p) => p.cycleTrackingEnabled)}
            selectedKey={selectedKey}
            onSubmit={(personId, input) => {
              startTransition(async () => {
                await addCycle(personId, input);
                setPanelMode(null);
              });
            }}
          />
        )}

        {panelMode === "intimacy" && (
          <IntimacyForm
            people={people}
            selectedKey={selectedKey}
            onSubmit={(input) => {
              startTransition(async () => {
                await addIntimacyEntry(input);
                setPanelMode(null);
              });
            }}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <h4 className={EYEBROW_CLASS}>Visits & appointments</h4>
          {selectedVisits.length === 0 && (
            <p className="text-xs text-foreground/40">No visits planned for this day.</p>
          )}
          <div className="flex flex-col divide-y divide-wine/10">
            {selectedVisits.map((v) => (
              <VisitEntry
                key={v.id}
                visit={v}
                people={people}
                conflicts={visitConflicts(v, selectedKey)}
                conflictPersonIds={menstrualIdsToday}
                isPending={isPending}
                onSave={(input) => {
                  startTransition(async () => {
                    await updateVisit(v.id, input);
                  });
                }}
                onDelete={() => startTransition(() => deleteVisit(v.id))}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h4 className={EYEBROW_CLASS}>Intimacy</h4>
          {selectedIntimacy.length === 0 && (
            <p className="text-xs text-foreground/40">Nothing logged yet.</p>
          )}
          <div className="flex flex-col divide-y divide-wine/10">
            {selectedIntimacy.map((entry) => {
              const person = people.find((p) => p.id === entry.personId);
              return (
                <div key={entry.id} className="flex items-start justify-between gap-2 py-2">
                  <div className="flex items-start gap-2">
                    <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-accent text-accent" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {person?.name ?? "Unknown"} —{" "}
                        {entry.protected ? "Protected" : "Unprotected"}
                      </p>
                      {entry.notes && <p className="text-xs text-foreground/60">{entry.notes}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => deleteIntimacyEntry(entry.id))}
                    className="text-foreground/40 hover:text-primary"
                    aria-label="Delete intimacy entry"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CycleForm({
  people,
  selectedKey,
  onSubmit,
}: {
  people: PersonSummary[];
  selectedKey: string;
  onSubmit: (
    personId: string,
    input: {
      startDate: string;
      endDate?: string;
      cycleLength?: number;
      periodLength?: number;
    },
  ) => void;
}) {
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const person = people.find((p) => p.id === personId);
  const [endDate, setEndDate] = useState("");
  const [cycleLength, setCycleLength] = useState(person?.defaultCycleLength ?? 28);
  const [periodLength, setPeriodLength] = useState(person?.defaultPeriodLength ?? 5);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!personId) return;
        onSubmit(personId, {
          startDate: selectedKey,
          endDate: endDate || undefined,
          cycleLength,
          periodLength,
        });
      }}
      className="flex flex-col gap-2.5 rounded-xl border border-wine/10 bg-surface/60 p-3"
    >
      <p className="text-xs text-foreground/60">Logs this day as the period start.</p>
      <select
        value={personId}
        onChange={(e) => {
          const next = people.find((p) => p.id === e.target.value);
          setPersonId(e.target.value);
          if (next) {
            setCycleLength(next.defaultCycleLength);
            setPeriodLength(next.defaultPeriodLength);
          }
        }}
        className={FIELD_CLASS}
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <label className="flex flex-col gap-1 text-xs text-foreground/70">
        End date (optional)
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={FIELD_CLASS}
        />
      </label>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-foreground/70">
          Cycle length
          <input
            type="number"
            min={15}
            max={60}
            value={cycleLength}
            onChange={(e) => setCycleLength(Number(e.target.value))}
            className={FIELD_CLASS}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-foreground/70">
          Period length
          <input
            type="number"
            min={1}
            max={14}
            value={periodLength}
            onChange={(e) => setPeriodLength(Number(e.target.value))}
            className={FIELD_CLASS}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={!personId}
        className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Save cycle
      </button>
    </form>
  );
}

function VisitEntry({
  visit,
  people,
  conflicts,
  conflictPersonIds,
  isPending,
  onSave,
  onDelete,
}: {
  visit: VisitSummary;
  people: PersonSummary[];
  conflicts: PersonSummary[];
  conflictPersonIds: Set<string>;
  isPending: boolean;
  onSave: (input: {
    date: string;
    time?: string;
    type: "CASUAL" | "FORMAL";
    status: VisitStatus;
    personIds: string[];
    notes?: string;
  }) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const visitDateKey = isoToKey(visit.scheduledAt);
  const existingTime = isoToTime(visit.scheduledAt);
  const hasTime = existingTime !== "00:00";

  const [type, setType] = useState<"CASUAL" | "FORMAL">(visit.type);
  const [time, setTime] = useState(hasTime ? existingTime : "");
  const [status, setStatus] = useState<VisitStatus>(visit.status);
  const [personIds, setPersonIds] = useState<string[]>(visit.people.map((p) => p.id));
  const [notes, setNotes] = useState(visit.notes ?? "");

  function resetFromVisit() {
    setType(visit.type);
    setTime(hasTime ? existingTime : "");
    setStatus(visit.status);
    setPersonIds(visit.people.map((p) => p.id));
    setNotes(visit.notes ?? "");
  }

  const TypeIcon = visit.type === "FORMAL" ? Stethoscope : CalendarDays;
  const StatusIcon = STATUS_META[visit.status].icon;
  const cancelled = visit.status === "CANCELLED";

  return (
    <div className={`flex items-start justify-between gap-2 py-2 ${cancelled ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-2">
        <TypeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/50" />
        <div>
          <p className={`text-sm font-medium text-foreground ${cancelled ? "line-through" : ""}`}>
            {visit.type === "FORMAL" ? "Appointment" : "Visit"} —{" "}
            {visit.people.map((p) => p.name).join(", ")}
            {hasTime && (
              <span className="ml-1.5 font-normal text-foreground/50">
                {formatTimeLabel(existingTime)}
              </span>
            )}
          </p>
          {visit.notes && <p className="text-xs text-foreground/60">{visit.notes}</p>}
          <p
            className={`mt-0.5 flex items-center gap-1 text-xs ${STATUS_META[visit.status].className}`}
          >
            <StatusIcon className="h-3 w-3" />
            {STATUS_META[visit.status].label}
          </p>
          {conflicts.length > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {conflicts.map((p) => p.name).join(", ")}{" "}
              {conflicts.length === 1 ? "is" : "are"} expected on their period
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) resetFromVisit();
          }}
        >
          <DialogTrigger
            className="text-foreground/40 hover:text-primary"
            aria-label="View and edit visit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{visit.type === "FORMAL" ? "Appointment" : "Visit"} details</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (personIds.length === 0) return;
                onSave({
                  date: visitDateKey,
                  time: time || undefined,
                  type,
                  status,
                  personIds,
                  notes,
                });
                setOpen(false);
              }}
              className="flex flex-col gap-3"
            >
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <Label>Type</Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "CASUAL" | "FORMAL")}
                    className={FIELD_CLASS}
                  >
                    <option value="CASUAL">Visit</option>
                    <option value="FORMAL">Appointment</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Time</Label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as VisitStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_META) as VisitStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 rounded-md border border-wine/20 bg-surface p-2">
                <span className={EYEBROW_CLASS}>With</span>
                <div className="flex flex-wrap gap-1.5">
                  {people.map((p) => {
                    const checked = personIds.includes(p.id);
                    const conflict = conflictPersonIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setPersonIds((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((id) => id !== p.id)
                              : [...prev, p.id],
                          )
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          checked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-wine/15 text-foreground/60 hover:border-wine/30"
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                        {conflict && <AlertTriangle className="h-3 w-3 text-destructive" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-full"
                  onClick={() => {
                    onDelete();
                    setOpen(false);
                  }}
                >
                  Delete
                </Button>
                <Button
                  type="submit"
                  className="rounded-full"
                  disabled={personIds.length === 0}
                >
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <button
          type="button"
          disabled={isPending}
          onClick={onDelete}
          className="text-foreground/40 hover:text-primary"
          aria-label="Delete visit"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function VisitForm({
  people,
  selectedKey,
  conflictPersonIds,
  onSubmit,
}: {
  people: PersonSummary[];
  selectedKey: string;
  conflictPersonIds: Set<string>;
  onSubmit: (input: {
    date: string;
    time?: string;
    type: "CASUAL" | "FORMAL";
    personIds: string[];
    notes?: string;
  }) => void;
}) {
  const [type, setType] = useState<"CASUAL" | "FORMAL">("CASUAL");
  const [time, setTime] = useState("");
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const selectedConflicts = people.filter(
    (p) => personIds.includes(p.id) && conflictPersonIds.has(p.id),
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ date: selectedKey, time: time || undefined, type, personIds, notes });
      }}
      className="flex flex-col gap-2.5 rounded-xl border border-wine/10 bg-surface/60 p-3"
    >
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "CASUAL" | "FORMAL")}
          className={`flex-1 ${FIELD_CLASS}`}
        >
          <option value="CASUAL">Visit</option>
          <option value="FORMAL">Appointment</option>
        </select>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={FIELD_CLASS}
          aria-label="Time (optional)"
        />
      </div>
      <div className="flex flex-col gap-1.5 rounded-md border border-wine/20 bg-surface p-2">
        <span className={EYEBROW_CLASS}>With</span>
        <div className="flex flex-wrap gap-1.5">
          {people.map((p) => {
            const checked = personIds.includes(p.id);
            const conflict = conflictPersonIds.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setPersonIds((prev) =>
                    prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                  )
                }
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  checked
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-wine/15 text-foreground/60 hover:border-wine/30"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
                {conflict && <AlertTriangle className="h-3 w-3 text-destructive" />}
              </button>
            );
          })}
        </div>
      </div>
      {selectedConflicts.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {selectedConflicts.map((p) => p.name).join(", ")}{" "}
          {selectedConflicts.length === 1 ? "is" : "are"} expected on their period this day.
        </p>
      )}
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className={FIELD_CLASS}
      />
      <button
        type="submit"
        className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-cream transition-opacity hover:opacity-90"
      >
        Save visit
      </button>
    </form>
  );
}

function IntimacyForm({
  people,
  selectedKey,
  onSubmit,
}: {
  people: PersonSummary[];
  selectedKey: string;
  onSubmit: (input: {
    date: string;
    personId: string;
    protected: boolean;
    notes?: string;
  }) => void;
}) {
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [isProtected, setIsProtected] = useState(true);
  const [notes, setNotes] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ date: selectedKey, personId, protected: isProtected, notes });
      }}
      className="flex flex-col gap-2.5 rounded-xl border border-wine/10 bg-surface/60 p-3"
    >
      <select
        value={personId}
        onChange={(e) => setPersonId(e.target.value)}
        className={FIELD_CLASS}
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex gap-1 rounded-full border border-wine/15 bg-surface p-1 text-xs">
        <button
          type="button"
          onClick={() => setIsProtected(true)}
          className={`flex-1 rounded-full py-1.5 font-medium transition-colors ${
            isProtected ? "bg-primary text-cream" : "text-foreground/60 hover:text-primary"
          }`}
        >
          Protected
        </button>
        <button
          type="button"
          onClick={() => setIsProtected(false)}
          className={`flex-1 rounded-full py-1.5 font-medium transition-colors ${
            !isProtected ? "bg-primary text-cream" : "text-foreground/60 hover:text-primary"
          }`}
        >
          Unprotected
        </button>
      </div>
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className={FIELD_CLASS}
      />
      <button
        type="submit"
        className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-cream transition-opacity hover:opacity-90"
      >
        Save entry
      </button>
    </form>
  );
}
