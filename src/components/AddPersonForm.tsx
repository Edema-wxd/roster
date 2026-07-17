"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
      <Button type="button" size="lg" onClick={() => setOpen(true)} className="rounded-full">
        + Add Person
      </Button>
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
      className="flex flex-col gap-3 rounded-2xl bg-card/60 p-5"
    >
      <Input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="h-9"
      />
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WOMAN">Woman</SelectItem>
            <SelectItem value="MAN">Man</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
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
        Track cycle for this person
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
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={isPending || !name.trim()} className="rounded-full">
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="lg"
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
