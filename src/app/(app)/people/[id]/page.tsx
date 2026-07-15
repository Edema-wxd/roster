import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PersonDetailsForm } from "@/components/PersonDetailsForm";
import { CycleLog } from "@/components/CycleLog";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    include: { cycles: { orderBy: { startDate: "desc" } } },
  });

  if (!person) notFound();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
      <div className="lg:basis-1/2">
        <PersonDetailsForm person={person} />
      </div>
      <div className="lg:basis-1/2">
        <CycleLog
          personId={person.id}
          cycles={person.cycles.map((c) => ({
            id: c.id,
            startDate: c.startDate.toISOString(),
            endDate: c.endDate?.toISOString() ?? null,
            cycleLength: c.cycleLength,
            periodLength: c.periodLength,
            flowIntensity: c.flowIntensity,
            symptoms: c.symptoms,
            notes: c.notes,
          }))}
          defaultCycleLength={person.defaultCycleLength}
          defaultPeriodLength={person.defaultPeriodLength}
        />
      </div>
    </div>
  );
}
