import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddPersonForm } from "@/components/AddPersonForm";

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-primary">People</h1>
      </div>

      <AddPersonForm usedColors={people.map((p) => p.color)} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}`}
            className="flex items-center gap-3 rounded-xl bg-card/60 p-4 transition-colors hover:bg-blush/30"
          >
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: person.color }}
            />
            <div>
              <p className="font-display font-medium text-foreground">{person.name}</p>
              <p className="text-xs text-foreground/60">
                {person.cycleTrackingEnabled
                  ? `${person.defaultCycleLength}d cycle · ${person.defaultPeriodLength}d period`
                  : "Cycle tracking off"}
              </p>
            </div>
          </Link>
        ))}
        {people.length === 0 && (
          <p className="text-sm text-foreground/60">
            Add the first person to start tracking their cycle and planning around it.
          </p>
        )}
      </div>
    </div>
  );
}
