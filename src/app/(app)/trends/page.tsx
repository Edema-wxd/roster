import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/cycle";
import { cyclePhaseProgression, cycleLengthHistory } from "@/lib/prediction";
import { CyclePhaseProgressionChart, CycleLengthTrendChart } from "@/components/CycleTrendChart";

const PAST_DAYS = 180;
const FUTURE_DAYS = 30;

export default async function TrendsPage() {
  const [people, cycles] = await Promise.all([
    prisma.person.findMany({
      where: { isActive: true, cycleTrackingEnabled: true },
      orderBy: { name: "asc" },
    }),
    prisma.cycle.findMany({ orderBy: { startDate: "asc" } }),
  ]);

  const today = new Date();
  const rangeStartDate = new Date(today);
  rangeStartDate.setDate(rangeStartDate.getDate() - PAST_DAYS);
  const rangeStartKey = dateKey(
    rangeStartDate.getFullYear(),
    rangeStartDate.getMonth(),
    rangeStartDate.getDate(),
  );
  const rangeEndDate = new Date(today);
  rangeEndDate.setDate(rangeEndDate.getDate() + FUTURE_DAYS);
  const rangeEndKey = dateKey(
    rangeEndDate.getFullYear(),
    rangeEndDate.getMonth(),
    rangeEndDate.getDate(),
  );

  const phaseSeries = people.map((person) => {
    const personCycles = cycles
      .filter((c) => c.personId === person.id)
      .map((c) => ({
        startDate: c.startDate.toISOString(),
        endDate: c.endDate?.toISOString() ?? null,
        cycleLength: c.cycleLength,
        periodLength: c.periodLength,
      }));
    return {
      id: person.id,
      name: person.name,
      color: person.color,
      points: cyclePhaseProgression(
        personCycles,
        person.defaultCycleLength,
        person.defaultPeriodLength,
        person.defaultLutealPhaseLength,
        rangeStartKey,
        rangeEndKey,
      ),
    };
  });

  const lengthSeries = people.map((person) => {
    const personCycles = cycles
      .filter((c) => c.personId === person.id)
      .map((c) => ({
        startDate: c.startDate.toISOString(),
        endDate: c.endDate?.toISOString() ?? null,
        cycleLength: c.cycleLength,
        periodLength: c.periodLength,
      }));
    return {
      id: person.id,
      name: person.name,
      color: person.color,
      defaultCycleLength: person.defaultCycleLength,
      points: cycleLengthHistory(personCycles),
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-primary">Trends</h1>
        <p className="text-sm text-foreground/60">
          Where everyone is in their cycle, and how regular each person&apos;s cycle has been.
        </p>
      </div>

      {people.length === 0 ? (
        <p className="text-foreground/70">
          No one is being tracked yet.{" "}
          <Link href="/people" className="text-primary underline">
            Add a person
          </Link>{" "}
          and turn on cycle tracking to see trends here.
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-wine/10 bg-card/50 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground/50">
              Cycle phase, {rangeStartKey.split("-").slice(1).join("/")} –{" "}
              {rangeEndKey.split("-").slice(1).join("/")}
            </p>
            <CyclePhaseProgressionChart series={phaseSeries} />
          </div>

          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground/50">
              Cycle length regularity
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lengthSeries.map((s) => (
                <CycleLengthTrendChart
                  key={s.id}
                  name={s.name}
                  color={s.color}
                  points={s.points}
                  defaultCycleLength={s.defaultCycleLength}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
