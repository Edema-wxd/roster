import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { Calendar } from "@/components/Calendar";

export default async function DashboardPage() {
  const ownerId = await requireUserId();

  // Send first-time accounts through onboarding before the empty calendar.
  const account = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { onboardedAt: true },
  });
  if (account && !account.onboardedAt) redirect("/onboarding");

  const people = await prisma.person.findMany({
    where: { ownerId, isActive: true },
    orderBy: { name: "asc" },
  });
  const personIds = people.map((p) => p.id);

  const [cycles, visits, intimacyEntries] = await Promise.all([
    prisma.cycle.findMany({
      where: { personId: { in: personIds } },
      orderBy: { startDate: "desc" },
    }),
    prisma.visit.findMany({
      where: { ownerId },
      include: { people: { include: { person: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.intimacyEntry.findMany({
      where: { personId: { in: personIds } },
      orderBy: { date: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <p className="font-display text-lg text-foreground">Your calendar is empty</p>
          <p className="mt-1 text-sm text-foreground/60">
            <Link href="/people" className="text-primary underline">
              Add a partner
            </Link>{" "}
            to start tracking their cycle and planning visits around it.
          </p>
        </div>
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
