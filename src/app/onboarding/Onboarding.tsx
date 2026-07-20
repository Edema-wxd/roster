"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Droplet, Heart, Sparkles, Users } from "lucide-react";
import { addPerson } from "@/app/(app)/people/actions";
import { addCycle } from "@/app/(app)/people/[id]/actions";
import { completeOnboarding } from "./actions";
import { PERSON_PALETTE } from "@/lib/personPalette";
import type { Gender } from "@/generated/prisma/enums";
import { ThemeToggle } from "@/components/ThemeToggle";
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

const GENDER_LABELS: Record<Gender, string> = { WOMAN: "Woman", MAN: "Man", OTHER: "Other" };
const trackingDefault = (g: Gender) => g !== "MAN";

type Step = "welcome" | "partner" | "cycle" | "done";
const FLOW: Step[] = ["welcome", "partner", "cycle", "done"];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Onboarding({ suggestedColor }: { suggestedColor: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Partner fields
  const [name, setName] = useState("");
  const [color, setColor] = useState(suggestedColor);
  const [gender, setGender] = useState<Gender>("WOMAN");
  const [tracking, setTracking] = useState(true);
  const [trackingTouched, setTrackingTouched] = useState(false);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [lutealLength, setLutealLength] = useState(14);

  // Created partner + first-cycle fields
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [startDate, setStartDate] = useState("");

  function finish() {
    startTransition(async () => {
      await completeOnboarding();
      router.push("/dashboard");
      router.refresh();
    });
  }

  function savePartner() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await addPerson({
          name,
          color,
          gender,
          cycleTrackingEnabled: tracking,
          defaultCycleLength: cycleLength,
          defaultPeriodLength: periodLength,
          defaultLutealPhaseLength: lutealLength,
        });
        setPartnerId(id);
        setPartnerName(name.trim());
        setStep(tracking ? "cycle" : "done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
      }
    });
  }

  function saveCycle() {
    if (!partnerId || !startDate) return;
    setError(null);
    startTransition(async () => {
      try {
        await addCycle(partnerId, { startDate, periodLength });
        setStep("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
      }
    });
  }

  const stepIndex = FLOW.indexOf(step);

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-semibold text-primary">Roster</span>
        <div className="flex items-center gap-4">
          {step !== "done" && (
            <button
              type="button"
              onClick={finish}
              disabled={isPending}
              className="text-sm text-foreground/50 transition-colors hover:text-primary disabled:opacity-50"
            >
              Skip setup
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          {/* progress */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {FLOW.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  i <= stepIndex ? "w-8 bg-primary" : "w-4 bg-border"
                }`}
              />
            ))}
          </div>

          {step === "welcome" && (
            <div className="flex flex-col items-center text-center">
              <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-7 w-7" />
              </span>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                Welcome to Roster
              </h1>
              <p className="mt-3 text-foreground/70">
                Keep track of the people you&apos;re close to — where each of them is in her
                cycle, and the visits you&apos;re planning — all on one calendar.
              </p>
              <p className="mt-2 text-sm text-foreground/50">
                Let&apos;s add your first partner. It takes a minute, and you can change anything
                later.
              </p>
              <Button
                type="button"
                size="lg"
                onClick={() => setStep("partner")}
                className="mt-8 w-full rounded-full"
              >
                Add your first partner <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "partner" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePartner();
              }}
              className="flex flex-col gap-4"
            >
              <div className="text-center">
                <h1 className="font-display text-2xl font-semibold text-foreground">
                  Who are you tracking?
                </h1>
                <p className="mt-1 text-sm text-foreground/60">
                  Just a name to start — the rest is optional.
                </p>
              </div>

              <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
                Name
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ada"
                  className="h-10"
                />
              </Label>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-foreground/70">Color</span>
                {PERSON_PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Choose color ${c}`}
                    className={`h-6 w-6 shrink-0 rounded-full border-2 ${
                      color === c ? "border-foreground" : "border-transparent"
                    }`}
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
                    if (!trackingTouched) setTracking(trackingDefault(next));
                  }}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>{(v) => GENDER_LABELS[v as Gender]}</SelectValue>
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
                  checked={tracking}
                  onCheckedChange={(checked) => {
                    setTrackingTouched(true);
                    setTracking(checked === true);
                  }}
                />
                Track her cycle
              </Label>

              {tracking && (
                <div className="flex gap-3">
                  <Label className="flex flex-1 flex-col items-start gap-1 text-xs text-foreground/70">
                    Cycle length
                    <Input
                      type="number"
                      min={15}
                      max={60}
                      value={cycleLength}
                      onChange={(e) => setCycleLength(Number(e.target.value))}
                      className="h-10"
                    />
                  </Label>
                  <Label className="flex flex-1 flex-col items-start gap-1 text-xs text-foreground/70">
                    Period length
                    <Input
                      type="number"
                      min={1}
                      max={14}
                      value={periodLength}
                      onChange={(e) => setPeriodLength(Number(e.target.value))}
                      className="h-10"
                    />
                  </Label>
                  <Label className="flex flex-1 flex-col items-start gap-1 text-xs text-foreground/70">
                    Luteal length
                    <Input
                      type="number"
                      min={8}
                      max={20}
                      value={lutealLength}
                      onChange={(e) => setLutealLength(Number(e.target.value))}
                      className="h-10"
                    />
                  </Label>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("welcome")}
                  className="text-sm text-foreground/50 hover:text-primary"
                >
                  Back
                </button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isPending || !name.trim()}
                  className="rounded-full"
                >
                  {isPending ? "Saving…" : "Continue"}
                  {!isPending && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          )}

          {step === "cycle" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCycle();
              }}
              className="flex flex-col gap-4"
            >
              <div className="text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Droplet className="h-6 w-6" />
                </span>
                <h1 className="font-display text-2xl font-semibold text-foreground">
                  When did {partnerName}&apos;s last period start?
                </h1>
                <p className="mt-1 text-sm text-foreground/60">
                  This lets Roster predict her cycle right away. You can skip it and log one later.
                </p>
              </div>

              <Label className="flex flex-col items-start gap-1 text-sm text-foreground/70">
                Period start date
                <Input
                  type="date"
                  max={todayKey()}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                />
              </Label>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("done")}
                  disabled={isPending}
                  className="text-sm text-foreground/50 hover:text-primary disabled:opacity-50"
                >
                  Skip for now
                </button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isPending || !startDate}
                  className="rounded-full"
                >
                  {isPending ? "Saving…" : "Save & continue"}
                  {!isPending && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center text-center">
              <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-7 w-7" />
              </span>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                You&apos;re all set
              </h1>
              <p className="mt-3 text-foreground/70">
                {partnerName} is on your roster. Your calendar shows her cycle at a glance — add
                more partners, plan a visit, or log intimacy whenever you like.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-left text-sm text-foreground/60">
                <span className="flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-primary" /> Period &amp; fertile days, marked on
                  the calendar
                </span>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Predictions of what&apos;s coming up
                </span>
                <span className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" /> Visits &amp; intimacy, kept in one place
                </span>
              </div>
              <Button
                type="button"
                size="lg"
                onClick={finish}
                disabled={isPending}
                className="mt-8 w-full rounded-full"
              >
                {isPending ? "Opening…" : "Go to your calendar"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
