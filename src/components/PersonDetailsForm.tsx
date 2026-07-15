"use client";

import { useState, useTransition } from "react";
import { updatePersonDetails } from "@/app/(app)/people/[id]/actions";
import { archivePerson } from "@/app/(app)/people/actions";
import { useRouter } from "next/navigation";

export function PersonDetailsForm({
  person,
}: {
  person: {
    id: string;
    name: string;
    color: string;
    notes: string | null;
    allergies: string | null;
    foodPreferences: string | null;
    defaultCycleLength: number;
    defaultPeriodLength: number;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(person.name);
  const [color, setColor] = useState(person.color);
  const [notes, setNotes] = useState(person.notes ?? "");
  const [allergies, setAllergies] = useState(person.allergies ?? "");
  const [foodPreferences, setFoodPreferences] = useState(person.foodPreferences ?? "");
  const [cycleLength, setCycleLength] = useState(person.defaultCycleLength);
  const [periodLength, setPeriodLength] = useState(person.defaultPeriodLength);
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
            defaultCycleLength: cycleLength,
            defaultPeriodLength: periodLength,
            notes,
            allergies,
            foodPreferences,
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        });
      }}
      className="flex flex-col gap-3 rounded-2xl bg-cream/60 p-5"
    >
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 rounded-full" style={{ backgroundColor: color }} />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm font-medium"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-wine/20 bg-white/80"
        />
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
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col text-sm text-foreground/70">
        Allergies
        <textarea
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          rows={2}
          placeholder="e.g. peanuts, shellfish"
          className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col text-sm text-foreground/70">
        Food preferences
        <textarea
          value={foodPreferences}
          onChange={(e) => setFoodPreferences(e.target.value)}
          rows={2}
          placeholder="e.g. vegetarian, no spicy food"
          className="mt-1 rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-cream hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span className="text-sm text-foreground/60">Saved.</span>}
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              await archivePerson(person.id);
              router.push("/people");
            });
          }}
          className="ml-auto text-sm text-foreground/50 hover:text-primary"
        >
          Archive
        </button>
      </div>
    </form>
  );
}
