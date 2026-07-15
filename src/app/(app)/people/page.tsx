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
        <h1 className="text-2xl font-semibold text-primary">People</h1>
      </div>

      <AddPersonForm />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}`}
            className="flex items-center gap-3 rounded-xl bg-cream/60 p-4 transition-colors hover:bg-blush/30"
          >
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: person.color }}
            />
            <div>
              <p className="font-medium text-foreground">{person.name}</p>
              <p className="text-xs text-foreground/60">
                {person.defaultCycleLength}d cycle · {person.defaultPeriodLength}d period
              </p>
            </div>
          </Link>
        ))}
        {people.length === 0 && (
          <p className="text-sm text-foreground/60">No one added yet.</p>
        )}
      </div>
    </div>
  );
}
