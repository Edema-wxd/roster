"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addIntimacyEntry,
  addVisit,
  deleteIntimacyEntry,
  deleteVisit,
} from "@/app/(app)/dashboard/actions";
import { dateKey, isoToKey, loggedPeriodStatus, predictedPeriodStatus } from "@/lib/cycle";

export type PersonSummary = {
  id: string;
  name: string;
  color: string;
  defaultCycleLength: number;
  defaultPeriodLength: number;
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
  type: "VISIT" | "APPOINTMENT";
  notes: string | null;
  people: { id: string; name: string; color: string }[];
};

export type IntimacySummary = {
  id: string;
  personId: string;
  date: string;
  protected: boolean;
  notes: string | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string>(
    dateKey(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const [panelMode, setPanelMode] = useState<"visit" | "intimacy" | null>(null);
  const [isPending, startTransition] = useTransition();

  const weeks = useMemo(() => buildMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

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

  function personStatusForKey(person: PersonSummary, key: string): "logged" | "predicted" | null {
    const personCycles = cyclesByPerson.get(person.id) ?? [];
    if (loggedPeriodStatus(personCycles, person.defaultPeriodLength, key)) return "logged";
    if (
      predictedPeriodStatus(
        personCycles,
        person.defaultCycleLength,
        person.defaultPeriodLength,
        key,
      )
    )
      return "predicted";
    return null;
  }

  const selectedVisits = visitsByKey.get(selectedKey) ?? [];
  const selectedIntimacy = intimacyByKey.get(selectedKey) ?? [];

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div className="flex flex-1 flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col rounded-2xl bg-cream/50 p-4 lg:basis-3/4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="rounded-full px-3 py-1 text-lg text-foreground/70 hover:bg-blush/40"
          >
            ‹
          </button>
          <h2 className="text-lg font-semibold text-primary">
            {new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="rounded-full px-3 py-1 text-lg text-foreground/70 hover:bg-blush/40"
          >
            ›
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
                {p.name}
              </span>
            ))}
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
          {weeks.flat().map((cell) => {
            const key = dateKey(cell.year, cell.month, cell.day);
            const isSelected = key === selectedKey;
            const dayVisits = visitsByKey.get(key) ?? [];
            const dayIntimacy = intimacyByKey.get(key) ?? [];

            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`flex min-h-20 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-white"
                    : "border-transparent bg-white/40 hover:bg-white/70"
                } ${!cell.inMonth ? "opacity-40" : ""}`}
              >
                <span className="text-xs font-medium text-foreground/80">{cell.day}</span>
                <div className="flex flex-wrap gap-0.5">
                  {people.map((p) => {
                    const status = personStatusForKey(p, key);
                    if (!status) return null;
                    return (
                      <span
                        key={p.id}
                        title={`${p.name} — ${status === "logged" ? "period logged" : "predicted period"}`}
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: p.color,
                          opacity: status === "logged" ? 1 : 0.4,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {dayVisits.length > 0 && <span className="text-xs">📅</span>}
                  {dayIntimacy.length > 0 && <span className="text-xs">❤️</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-cream/50 p-4 lg:basis-1/4">
        <div>
          <h3 className="text-base font-semibold text-primary">
            {new Date(`${selectedKey}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPanelMode(panelMode === "visit" ? null : "visit")}
            className="flex-1 rounded-full bg-primary px-3 py-2 text-sm font-medium text-cream hover:opacity-90"
          >
            + Visit
          </button>
          <button
            type="button"
            onClick={() => setPanelMode(panelMode === "intimacy" ? null : "intimacy")}
            className="flex-1 rounded-full bg-wine px-3 py-2 text-sm font-medium text-cream hover:opacity-90"
          >
            + Intimacy
          </button>
        </div>

        {panelMode === "visit" && (
          <VisitForm
            people={people}
            selectedKey={selectedKey}
            onSubmit={(input) => {
              startTransition(async () => {
                await addVisit(input);
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

        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-foreground/70">Visits & appointments</h4>
          {selectedVisits.length === 0 && (
            <p className="text-xs text-foreground/50">Nothing scheduled.</p>
          )}
          {selectedVisits.map((v) => (
            <div key={v.id} className="rounded-lg bg-white/70 p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {v.type === "APPOINTMENT" ? "Appointment" : "Visit"} —{" "}
                  {v.people.map((p) => p.name).join(", ")}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => deleteVisit(v.id))}
                  className="text-xs text-foreground/40 hover:text-primary"
                >
                  ✕
                </button>
              </div>
              {v.notes && <p className="mt-1 text-xs text-foreground/60">{v.notes}</p>}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-foreground/70">Intimacy</h4>
          {selectedIntimacy.length === 0 && (
            <p className="text-xs text-foreground/50">Nothing logged.</p>
          )}
          {selectedIntimacy.map((entry) => {
            const person = people.find((p) => p.id === entry.personId);
            return (
              <div key={entry.id} className="rounded-lg bg-white/70 p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {person?.name ?? "Unknown"} — {entry.protected ? "Protected" : "Unprotected"}
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => deleteIntimacyEntry(entry.id))}
                    className="text-xs text-foreground/40 hover:text-primary"
                  >
                    ✕
                  </button>
                </div>
                {entry.notes && <p className="mt-1 text-xs text-foreground/60">{entry.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VisitForm({
  people,
  selectedKey,
  onSubmit,
}: {
  people: PersonSummary[];
  selectedKey: string;
  onSubmit: (input: {
    date: string;
    type: "VISIT" | "APPOINTMENT";
    personIds: string[];
    notes?: string;
  }) => void;
}) {
  const [type, setType] = useState<"VISIT" | "APPOINTMENT">("VISIT");
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ date: selectedKey, type, personIds, notes });
      }}
      className="flex flex-col gap-2 rounded-lg bg-white/70 p-3"
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value as "VISIT" | "APPOINTMENT")}
        className="rounded border border-wine/20 px-2 py-1 text-sm"
      >
        <option value="VISIT">Visit</option>
        <option value="APPOINTMENT">Appointment</option>
      </select>
      <select
        multiple
        value={personIds}
        onChange={(e) =>
          setPersonIds(Array.from(e.target.selectedOptions).map((o) => o.value))
        }
        className="rounded border border-wine/20 px-2 py-1 text-sm"
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="rounded border border-wine/20 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-cream hover:opacity-90"
      >
        Save Visit
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
      className="flex flex-col gap-2 rounded-lg bg-white/70 p-3"
    >
      <select
        value={personId}
        onChange={(e) => setPersonId(e.target.value)}
        className="rounded border border-wine/20 px-2 py-1 text-sm"
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={isProtected}
            onChange={() => setIsProtected(true)}
          />
          Protected
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={!isProtected}
            onChange={() => setIsProtected(false)}
          />
          Unprotected
        </label>
      </div>
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="rounded border border-wine/20 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        className="rounded-full bg-wine px-3 py-1.5 text-sm font-medium text-cream hover:opacity-90"
      >
        Save Entry
      </button>
    </form>
  );
}
