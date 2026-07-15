"use client";

import { useState, useTransition } from "react";
import { addCycle, deleteCycle } from "@/app/(app)/people/[id]/actions";

type Cycle = {
  id: string;
  startDate: string;
  endDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  flowIntensity: "LIGHT" | "MEDIUM" | "HEAVY" | null;
  symptoms: string[];
  notes: string | null;
};

export function CycleLog({
  personId,
  cycles,
  defaultCycleLength,
  defaultPeriodLength,
}: {
  personId: string;
  cycles: Cycle[];
  defaultCycleLength: number;
  defaultPeriodLength: number;
}) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cycleLength, setCycleLength] = useState(defaultCycleLength);
  const [periodLength, setPeriodLength] = useState(defaultPeriodLength);
  const [flowIntensity, setFlowIntensity] = useState<"LIGHT" | "MEDIUM" | "HEAVY" | "">("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Cycle History</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-cream hover:opacity-90"
        >
          {open ? "Close" : "+ Log Cycle"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await addCycle(personId, {
                startDate,
                endDate: endDate || undefined,
                cycleLength,
                periodLength,
                flowIntensity: flowIntensity || undefined,
                symptoms: symptoms
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                notes,
              });
              setOpen(false);
              setStartDate("");
              setEndDate("");
              setSymptoms("");
              setNotes("");
            });
          }}
          className="flex flex-col gap-3 rounded-2xl bg-cream/60 p-5"
        >
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col text-sm text-foreground/70">
              Start date
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col text-sm text-foreground/70">
              End date (optional)
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col text-sm text-foreground/70">
              Cycle length (days)
              <input
                type="number"
                min={15}
                max={60}
                value={cycleLength}
                onChange={(e) => setCycleLength(Number(e.target.value))}
                className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col text-sm text-foreground/70">
              Period length (days)
              <input
                type="number"
                min={1}
                max={14}
                value={periodLength}
                onChange={(e) => setPeriodLength(Number(e.target.value))}
                className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="flex flex-col text-sm text-foreground/70">
            Flow intensity
            <select
              value={flowIntensity}
              onChange={(e) => setFlowIntensity(e.target.value as typeof flowIntensity)}
              className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="LIGHT">Light</option>
              <option value="MEDIUM">Medium</option>
              <option value="HEAVY">Heavy</option>
            </select>
          </label>

          <label className="flex flex-col text-sm text-foreground/70">
            Symptoms (comma-separated)
            <input
              type="text"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="cramps, mood, headache"
              className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col text-sm text-foreground/70">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={isPending || !startDate}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-cream hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save Cycle"}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {cycles.length === 0 && (
          <p className="text-sm text-foreground/50">No cycles logged yet.</p>
        )}
        {cycles.map((cycle) => (
          <div
            key={cycle.id}
            className="flex items-start justify-between rounded-xl bg-white/70 p-3 text-sm"
          >
            <div>
              <p className="font-medium">
                {new Date(cycle.startDate).toLocaleDateString()}
                {cycle.endDate && ` – ${new Date(cycle.endDate).toLocaleDateString()}`}
              </p>
              <p className="text-xs text-foreground/60">
                {cycle.cycleLength ?? defaultCycleLength}d cycle ·{" "}
                {cycle.periodLength ?? defaultPeriodLength}d period
                {cycle.flowIntensity && ` · ${cycle.flowIntensity.toLowerCase()} flow`}
              </p>
              {cycle.symptoms.length > 0 && (
                <p className="text-xs text-foreground/60">{cycle.symptoms.join(", ")}</p>
              )}
              {cycle.notes && <p className="mt-1 text-xs text-foreground/60">{cycle.notes}</p>}
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => deleteCycle(personId, cycle.id))}
              className="text-xs text-foreground/40 hover:text-primary"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
