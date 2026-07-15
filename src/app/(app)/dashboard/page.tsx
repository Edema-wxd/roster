import { prisma } from "@/lib/prisma";
import { Calendar } from "@/components/Calendar";

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

  return (
    <div className="flex flex-1 flex-col p-6">
      {people.length === 0 ? (
        <p className="text-foreground/70">
          No one to track yet.{" "}
          <a href="/people" className="text-primary underline">
            Add a person
          </a>{" "}
          to get started.
        </p>
      ) : (
        <Calendar
          people={people.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            defaultCycleLength: p.defaultCycleLength,
            defaultPeriodLength: p.defaultPeriodLength,
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
