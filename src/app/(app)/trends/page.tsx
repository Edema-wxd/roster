import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { addDaysToKey, dateKey } from "@/lib/cycle";
import { cyclePhaseProgression, cycleLengthHistory } from "@/lib/prediction";
import { CycleRibbon, type RibbonPartner } from "@/components/CycleRibbon";
import { RegularityCard } from "@/components/RegularityCard";

const PAST_DAYS = 90;
const FUTURE_DAYS = 35;

export default async function TrendsPage() {
  const ownerId = await requireUserId();

  const people = await prisma.person.findMany({
    where: { ownerId, isActive: true, cycleTrackingEnabled: true },
    orderBy: { name: "asc" },
  });
  const cycles = await prisma.cycle.findMany({
    where: { personId: { in: people.map((p) => p.id) } },
    orderBy: { startDate: "asc" },
  });

  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const rangeStartKey = addDaysToKey(todayKey, -PAST_DAYS);
  const rangeEndKey = addDaysToKey(todayKey, FUTURE_DAYS);

  const dates: string[] = [];
  for (let key = rangeStartKey; key <= rangeEndKey; key = addDaysToKey(key, 1)) {
    dates.push(key);
  }

  const cyclesFor = (personId: string) =>
    cycles
      .filter((c) => c.personId === personId)
      .map((c) => ({
        startDate: c.startDate.toISOString(),
        endDate: c.endDate?.toISOString() ?? null,
        cycleLength: c.cycleLength,
        periodLength: c.periodLength,
      }));

  const ribbonPartners: RibbonPartner[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    color: person.color,
    days: cyclePhaseProgression(
      cyclesFor(person.id),
      person.defaultCycleLength,
      person.defaultPeriodLength,
      person.defaultLutealPhaseLength,
      rangeStartKey,
      rangeEndKey,
    ).map((p) => ({ date: p.date, phase: p.phase, predicted: p.predicted })),
  }));

  const regularity = people.map((person) => ({
    id: person.id,
    name: person.name,
    color: person.color,
    defaultCycleLength: person.defaultCycleLength,
    lengths: cycleLengthHistory(cyclesFor(person.id)).map((p) => p.length),
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-primary">Trends</h1>
        <p className="text-sm text-foreground/60">
          Each partner&apos;s rhythm over time — recent and upcoming periods, and how predictable
          their cycle is.
        </p>
      </header>

      {people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <p className="font-display text-lg text-foreground">No cycles to chart yet</p>
          <p className="mt-1 text-sm text-foreground/60">
            <Link href="/people" className="text-primary underline">
              Add a partner
            </Link>{" "}
            and turn on cycle tracking to see their rhythm here.
          </p>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Periods &amp; fertile windows
              </h2>
              <p className="text-sm text-foreground/55">
                The last three months and the weeks ahead. Solid marks are logged; hatched are
                expected.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <CycleRibbon dates={dates} todayKey={todayKey} partners={ribbonPartners} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                How regular each cycle is
              </h2>
              <p className="text-sm text-foreground/55">
                Typical cycle length and how much it tends to vary.
              </p>
            </div>
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regularity.map((r) => (
                <RegularityCard
                  key={r.id}
                  name={r.name}
                  color={r.color}
                  defaultCycleLength={r.defaultCycleLength}
                  lengths={r.lengths}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
