"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addPerson } from "@/app/(app)/people/actions";
import { PERSON_PALETTE, getNextPersonColor } from "@/lib/personPalette";
import type { Gender } from "@/generated/prisma/enums";
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

const GENDER_LABELS: Record<Gender, string> = {
  WOMAN: "Woman",
  MAN: "Man",
  OTHER: "Other",
};

function defaultTrackingForGender(gender: Gender): boolean {
  return gender !== "MAN";
}

export function AddPersonForm({ usedColors }: { usedColors: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(() => getNextPersonColor(usedColors));
  const [gender, setGender] = useState<Gender>("WOMAN");
  const [cycleTrackingEnabled, setCycleTrackingEnabled] = useState(true);
  const [trackingTouched, setTrackingTouched] = useState(false);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [lutealLength, setLutealLength] = useState(14);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen(true)} className="rounded-full">
          <Plus className="h-4 w-4" /> Add partner
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            const { id } = await addPerson({
              name,
              color,
              gender,
              cycleTrackingEnabled,
              defaultCycleLength: cycleLength,
              defaultPeriodLength: periodLength,
              defaultLutealPhaseLength: lutealLength,
            });
            router.push(`/people/${id}`);
          } catch (err) {
            if (err instanceof Error) setError(err.message);
          }
        });
      }}
      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-5"
    >
      <p className="font-display text-lg font-semibold text-foreground">New partner</p>
      <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
        Name
        <Input
          type="text"
          placeholder="e.g. Ada"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="h-9"
        />
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-foreground/70">Color</span>
        {PERSON_PALETTE.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setColor(c)}
            className={`h-6 w-6 shrink-0 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
        Gender
        <Select
          value={gender}
          onValueChange={(value) => {
            const next = value as Gender;
            setGender(next);
            if (!trackingTouched) setCycleTrackingEnabled(defaultTrackingForGender(next));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{(value) => GENDER_LABELS[value as Gender]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
              <SelectItem key={g} value={g}>
                {GENDER_LABELS[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Label>

      <Label className="text-sm text-foreground/70">
        <Checkbox
          checked={cycleTrackingEnabled}
          onCheckedChange={(checked) => {
            setTrackingTouched(true);
            setCycleTrackingEnabled(checked);
          }}
        />
        Track their cycle
      </Label>

      {cycleTrackingEnabled && (
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
          <Label className="flex flex-1 flex-col items-start gap-1 text-sm text-foreground/70">
            Luteal length (days)
            <Input
              type="number"
              min={8}
              max={20}
              value={lutealLength}
              onChange={(e) => setLutealLength(Number(e.target.value))}
              className="h-9"
            />
          </Label>
        </div>
      )}

      {error && <p className="text-sm text-primary">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending || !name.trim()} className="rounded-full">
          {isPending ? "Saving…" : "Add partner"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="rounded-full"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
