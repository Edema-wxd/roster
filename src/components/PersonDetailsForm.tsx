"use client";

import { useState, useTransition } from "react";
import { updatePersonDetails } from "@/app/(app)/people/[id]/actions";
import { archivePerson } from "@/app/(app)/people/actions";
import { useRouter } from "next/navigation";
import { PERSON_PALETTE } from "@/lib/personPalette";
import type { Gender } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PersonDetailsForm({
  person,
  currentPhaseLabel,
}: {
  person: {
    id: string;
    name: string;
    color: string;
    gender: Gender;
    cycleTrackingEnabled: boolean;
    notes: string | null;
    allergies: string | null;
    foodPreferences: string | null;
    defaultCycleLength: number;
    defaultPeriodLength: number;
    defaultLutealPhaseLength: number;
  };
  currentPhaseLabel: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(person.name);
  const [color, setColor] = useState(person.color);
  const [gender, setGender] = useState<Gender>(person.gender);
  const [cycleTrackingEnabled, setCycleTrackingEnabled] = useState(
    person.cycleTrackingEnabled,
  );
  const [notes, setNotes] = useState(person.notes ?? "");
  const [allergies, setAllergies] = useState(person.allergies ?? "");
  const [foodPreferences, setFoodPreferences] = useState(person.foodPreferences ?? "");
  const [cycleLength, setCycleLength] = useState(person.defaultCycleLength);
  const [periodLength, setPeriodLength] = useState(person.defaultPeriodLength);
  const [lutealLength, setLutealLength] = useState(person.defaultLutealPhaseLength);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await updatePersonDetails(person.id, {
            name,
            color,
            gender,
            cycleTrackingEnabled,
            defaultCycleLength: cycleLength,
            defaultPeriodLength: periodLength,
            defaultLutealPhaseLength: lutealLength,
            notes,
            allergies,
            foodPreferences,
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        });
      }}
      className="flex flex-col gap-3 rounded-2xl bg-card/60 p-5"
    >
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 flex-1 font-medium"
        />
      </div>

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

      {cycleTrackingEnabled && currentPhaseLabel && (
        <p className="rounded-lg bg-surface/70 px-3 py-2 text-sm font-medium text-primary">
          {currentPhaseLabel}
        </p>
      )}

      <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
        Gender
        <Select value={gender} onValueChange={(value) => setGender(value as Gender)}>
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
          onCheckedChange={(checked) => setCycleTrackingEnabled(checked)}
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

      <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
        Notes
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Label>

      <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
        Allergies
        <Textarea
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          rows={2}
          placeholder="e.g. peanuts, shellfish"
        />
      </Label>

      <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
        Food preferences
        <Textarea
          value={foodPreferences}
          onChange={(e) => setFoodPreferences(e.target.value)}
          rows={2}
          placeholder="e.g. vegetarian, no spicy food"
        />
      </Label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={isPending} className="rounded-full">
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
        {saved && <span className="text-sm text-foreground/60">Saved.</span>}
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            startTransition(async () => {
              await archivePerson(person.id);
              router.push("/people");
            });
          }}
          className="ml-auto text-foreground/50 hover:text-primary"
        >
          Archive
        </Button>
      </div>
    </form>
  );
}
