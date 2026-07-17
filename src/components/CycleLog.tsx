"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  addCycle,
  addCycleDayLog,
  deleteCycle,
  deleteCycleDayLog,
} from "@/app/(app)/people/[id]/actions";
import type { FlowIntensity, OvulationTestResult, Symptom } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SYMPTOM_LABELS: Record<Symptom, string> = {
  CRAMPS: "Cramps",
  HEADACHE: "Headache",
  MOOD_SWINGS: "Mood swings",
  FATIGUE: "Fatigue",
  BLOATING: "Bloating",
  BREAST_TENDERNESS: "Breast tenderness",
  ACNE: "Acne",
  BACK_PAIN: "Back pain",
  NAUSEA: "Nausea",
  FOOD_CRAVINGS: "Food cravings",
  INSOMNIA: "Insomnia",
};

const ALL_SYMPTOMS = Object.keys(SYMPTOM_LABELS) as Symptom[];

type DayLog = {
  id: string;
  date: string;
  flowIntensity: FlowIntensity | null;
  symptoms: Symptom[];
  basalBodyTemp: number | null;
  ovulationTestResult: OvulationTestResult | null;
  notes: string | null;
};

type Cycle = {
  id: string;
  startDate: string;
  endDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  birthControlNotes: string | null;
  notes: string | null;
  dayLogs: DayLog[];
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
  const [birthControlNotes, setBirthControlNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Cycle History</h2>
        <Button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full">
          {open ? "Close" : "+ Log Cycle"}
        </Button>
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
                birthControlNotes,
                notes,
              });
              setOpen(false);
              setStartDate("");
              setEndDate("");
              setBirthControlNotes("");
              setNotes("");
            });
          }}
          className="flex flex-col gap-3 rounded-2xl bg-card/60 p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <Label className="flex flex-1 flex-col items-start gap-1 text-sm text-foreground/70">
              Start date
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </Label>
            <Label className="flex flex-1 flex-col items-start gap-1 text-sm text-foreground/70">
              End date (optional)
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
              />
            </Label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Label className="flex flex-1 flex-col items-start gap-1 text-sm text-foreground/70">
              Cycle length (days)
              <Input
                type="number"
                min={15}
                max={60}
                value={cycleLength}
                onChange={(e) => setCycleLength(Number(e.target.value))}
                className="h-9"
              />
            </Label>
            <Label className="flex flex-1 flex-col items-start gap-1 text-sm text-foreground/70">
              Period length (days)
              <Input
                type="number"
                min={1}
                max={14}
                value={periodLength}
                onChange={(e) => setPeriodLength(Number(e.target.value))}
                className="h-9"
              />
            </Label>
          </div>

          <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
            Birth control notes
            <Input
              type="text"
              value={birthControlNotes}
              onChange={(e) => setBirthControlNotes(e.target.value)}
              className="h-9"
            />
          </Label>

          <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
            Notes
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9"
            />
          </Label>

          <Button
            type="submit"
            size="lg"
            disabled={isPending || !startDate}
            className="self-start rounded-full"
          >
            {isPending ? "Saving…" : "Save Cycle"}
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {cycles.length === 0 && (
          <p className="text-sm text-foreground/50">No cycles logged yet.</p>
        )}
        {cycles.map((cycle) => (
          <CycleCard
            key={cycle.id}
            personId={personId}
            cycle={cycle}
            defaultCycleLength={defaultCycleLength}
            defaultPeriodLength={defaultPeriodLength}
          />
        ))}
      </div>
    </div>
  );
}

function CycleCard({
  personId,
  cycle,
  defaultCycleLength,
  defaultPeriodLength,
}: {
  personId: string;
  cycle: Cycle;
  defaultCycleLength: number;
  defaultPeriodLength: number;
}) {
  const [dayLogOpen, setDayLogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl bg-surface/70 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {new Date(cycle.startDate).toLocaleDateString()}
            {cycle.endDate && ` – ${new Date(cycle.endDate).toLocaleDateString()}`}
          </p>
          <p className="text-xs text-foreground/60">
            {cycle.cycleLength ?? defaultCycleLength}d cycle ·{" "}
            {cycle.periodLength ?? defaultPeriodLength}d period
          </p>
          {cycle.birthControlNotes && (
            <p className="text-xs text-foreground/60">BC: {cycle.birthControlNotes}</p>
          )}
          {cycle.notes && <p className="mt-1 text-xs text-foreground/60">{cycle.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDayLogOpen((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {dayLogOpen ? "Hide days" : `Days (${cycle.dayLogs.length})`}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteCycle(personId, cycle.id))}
            className="text-foreground/40 hover:text-primary"
            aria-label="Delete cycle"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {dayLogOpen && (
        <div className="mt-3 flex flex-col gap-2 border-t border-wine/10 pt-3">
          {cycle.dayLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded bg-card/50 p-2"
            >
              <div>
                <p className="font-medium">{new Date(log.date).toLocaleDateString()}</p>
                <p className="text-xs text-foreground/60">
                  {[
                    log.flowIntensity && `${log.flowIntensity.toLowerCase()} flow`,
                    log.basalBodyTemp && `${log.basalBodyTemp}°`,
                    log.ovulationTestResult && `ovulation: ${log.ovulationTestResult.toLowerCase()}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {log.symptoms.length > 0 && (
                  <p className="text-xs text-foreground/60">
                    {log.symptoms.map((s) => SYMPTOM_LABELS[s]).join(", ")}
                  </p>
                )}
                {log.notes && <p className="text-xs text-foreground/60">{log.notes}</p>}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => deleteCycleDayLog(personId, log.id))}
                className="text-foreground/40 hover:text-primary"
                aria-label="Delete day log"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <DayLogForm personId={personId} cycleId={cycle.id} defaultDate={cycle.startDate} />
        </div>
      )}
    </div>
  );
}

function DayLogForm({
  personId,
  cycleId,
  defaultDate,
}: {
  personId: string;
  cycleId: string;
  defaultDate: string;
}) {
  const [date, setDate] = useState(defaultDate.slice(0, 10));
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity | "">("");
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [basalBodyTemp, setBasalBodyTemp] = useState("");
  const [ovulationTestResult, setOvulationTestResult] = useState<OvulationTestResult | "">("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleSymptom(symptom: Symptom) {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await addCycleDayLog(personId, cycleId, {
            date,
            flowIntensity: flowIntensity || undefined,
            symptoms,
            basalBodyTemp: basalBodyTemp ? Number(basalBodyTemp) : undefined,
            ovulationTestResult: ovulationTestResult || undefined,
            notes,
          });
          setNotes("");
        });
      }}
      className="flex flex-col gap-2 rounded bg-card/40 p-2"
    >
      <div className="flex flex-wrap gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-7 flex-1 basis-32 text-xs"
        />
        <Select
          value={flowIntensity || undefined}
          onValueChange={(value) => setFlowIntensity(value as FlowIntensity)}
        >
          <SelectTrigger size="sm" className="text-xs">
            <SelectValue placeholder="Flow —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LIGHT">Light</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HEAVY">Heavy</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          step="0.1"
          placeholder="Basal temp"
          value={basalBodyTemp}
          onChange={(e) => setBasalBodyTemp(e.target.value)}
          className="h-7 w-24 text-xs"
        />
        <Select
          value={ovulationTestResult || undefined}
          onValueChange={(value) => setOvulationTestResult(value as OvulationTestResult)}
        >
          <SelectTrigger size="sm" className="text-xs">
            <SelectValue placeholder="Ovulation test —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NEGATIVE">Negative</SelectItem>
            <SelectItem value="POSITIVE">Positive</SelectItem>
            <SelectItem value="PEAK">Peak</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {ALL_SYMPTOMS.map((symptom) => (
          <Label key={symptom} className="text-xs font-normal">
            <Checkbox
              checked={symptoms.includes(symptom)}
              onCheckedChange={() => toggleSymptom(symptom)}
            />
            {SYMPTOM_LABELS[symptom]}
          </Label>
        ))}
      </div>
      <Input
        type="text"
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="h-7 text-xs"
      />
      <Button type="submit" size="sm" disabled={isPending || !date} className="self-start rounded-full">
        {isPending ? "Saving…" : "Log Day"}
      </Button>
    </form>
  );
}
