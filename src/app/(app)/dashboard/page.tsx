import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Calendar } from "@/components/Calendar";
import { computePrediction } from "@/lib/prediction";
import { dateKey, daysBetweenKeys } from "@/lib/cycle";

export default async function DashboardPage() {
  const [people, cycles, visits, intimacyEntries] = await Promise.all([
    prisma.person.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.cycle.findMany({ orderBy: { startDate: "desc" } }),
    prisma.visit.findMany({
      include: { people: { include: { person: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.intimacyEntry.findMany({ orderBy: { date: "desc" } }),
  ]);

  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const reminders = people
    .filter((p) => p.cycleTrackingEnabled)
    .map((person) => {
      const personCycles = cycles
        .filter((c) => c.personId === person.id)
        .map((c) => ({
          startDate: c.startDate.toISOString(),
          endDate: c.endDate?.toISOString() ?? null,
          cycleLength: c.cycleLength,
          periodLength: c.periodLength,
        }));
      const prediction = computePrediction(
        personCycles,
        person.defaultCycleLength,
        person.defaultPeriodLength,
        person.defaultLutealPhaseLength,
      );
      if (!prediction) return null;
      const daysAway = daysBetweenKeys(todayKey, prediction.predictedNextStartKey);
      if (daysAway < 0 || daysAway > 5) return null;
      return { personName: person.name, daysAway };
    })
    .filter((r): r is { personName: string; daysAway: number } => r !== null);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {reminders.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl bg-primary/10 p-3 text-sm text-primary">
          {reminders.map((r) => (
            <p key={r.personName}>
              {r.personName}&apos;s period is predicted{" "}
              {r.daysAway === 0 ? "today" : `in ${r.daysAway} day${r.daysAway === 1 ? "" : "s"}`}.
            </p>
          ))}
        </div>
      )}

      {people.length === 0 ? (
        <p className="text-foreground/70">
          Nothing on the calendar yet.{" "}
          <Link href="/people" className="text-primary underline">
            Add a person
          </Link>{" "}
          to start tracking their cycle and planning visits around it.
        </p>
      ) : (
        <Calendar
          people={people.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            cycleTrackingEnabled: p.cycleTrackingEnabled,
            defaultCycleLength: p.defaultCycleLength,
            defaultPeriodLength: p.defaultPeriodLength,
            defaultLutealPhaseLength: p.defaultLutealPhaseLength,
          }))}
          cycles={cycles.map((c) => ({
            id: c.id,
            personId: c.personId,
            startDate: c.startDate.toISOString(),
            endDate: c.endDate?.toISOString() ?? null,
            cycleLength: c.cycleLength,
            periodLength: c.periodLength,
          }))}
          visits={visits.map((v) => ({
            id: v.id,
            scheduledAt: v.scheduledAt.toISOString(),
            type: v.type,
            status: v.status,
            notes: v.notes,
            people: v.people.map((vp) => ({
              id: vp.person.id,
              name: vp.person.name,
              color: vp.person.color,
            })),
          }))}
          intimacyEntries={intimacyEntries.map((i) => ({
            id: i.id,
            personId: i.personId,
            date: i.date.toISOString(),
            protected: i.protected,
            notes: i.notes,
          }))}
        />
      )}
    </div>
  );
}
