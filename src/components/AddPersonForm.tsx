"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPerson } from "@/app/(app)/people/actions";

const DEFAULT_COLORS = ["#D44D5C", "#773344", "#E3B5A4", "#160029", "#8E5572"];

export function AddPersonForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream hover:opacity-90"
      >
        + Add Person
      </button>
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
              defaultCycleLength: cycleLength,
              defaultPeriodLength: periodLength,
            });
            router.push(`/people/${id}`);
          } catch (err) {
            if (err instanceof Error) setError(err.message);
          }
        });
      }}
      className="flex flex-col gap-3 rounded-2xl bg-cream/60 p-5"
    >
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="rounded border border-wine/20 bg-white/80 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground/70">Color</span>
        {DEFAULT_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
            style={{ backgroundColor: c }}
          />
        ))}
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
      {error && <p className="text-sm text-primary">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-cream hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-5 py-2 text-sm font-medium text-foreground/70 hover:bg-blush/30"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
