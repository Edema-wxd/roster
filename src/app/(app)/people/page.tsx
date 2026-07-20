import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { AddPersonForm } from "@/components/AddPersonForm";
import { PartnerCard, type PartnerCardData } from "@/components/PartnerCard";
import { partnerCycleStatus } from "@/lib/prediction";
import { dateKey } from "@/lib/cycle";

export default async function PeoplePage() {
  const ownerId = await requireUserId();

  const people = await prisma.person.findMany({
    where: { ownerId, isActive: true },
    orderBy: { name: "asc" },
  });
  const cycles = await prisma.cycle.findMany({
    where: { personId: { in: people.map((p) => p.id) } },
    orderBy: { startDate: "desc" },
  });

  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const partners: PartnerCardData[] = people.map((person) => {
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
      cycleTrackingEnabled: person.cycleTrackingEnabled,
      allergies: person.allergies,
      foodPreferences: person.foodPreferences,
      hasCycles: personCycles.length > 0,
      status: person.cycleTrackingEnabled
        ? partnerCycleStatus(
            personCycles,
            person.defaultCycleLength,
            person.defaultPeriodLength,
            person.defaultLutealPhaseLength,
            todayKey,
          )
        : null,
    };
  });

  const count = partners.length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl font-semibold text-primary">Partners</h1>
          {count > 0 && (
            <span className="text-sm text-foreground/50">
              {count} {count === 1 ? "person" : "people"}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground/60">
          Where each partner is in their cycle, and the things worth remembering.
        </p>
      </header>

      <AddPersonForm usedColors={people.map((p) => p.color)} />

      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <p className="font-display text-lg text-foreground">No partners yet</p>
          <p className="mt-1 text-sm text-foreground/60">
            Add the first person you want to keep track of.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      )}
    </div>
  );
}
