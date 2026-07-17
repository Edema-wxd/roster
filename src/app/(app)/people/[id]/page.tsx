import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PersonDetailsForm } from "@/components/PersonDetailsForm";
import { CycleLog } from "@/components/CycleLog";
import { computePrediction, currentPhaseLabel } from "@/lib/prediction";
import { dateKey } from "@/lib/cycle";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      cycles: { orderBy: { startDate: "desc" }, include: { dayLogs: { orderBy: { date: "asc" } } } },
    },
  });

  if (!person) notFound();

  const cyclesForPrediction = person.cycles.map((c) => ({
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString() ?? null,
    cycleLength: c.cycleLength,
    periodLength: c.periodLength,
  }));

  const prediction = computePrediction(
    cyclesForPrediction,
    person.defaultCycleLength,
    person.defaultPeriodLength,
    person.defaultLutealPhaseLength,
  );

  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const phaseLabel = person.cycleTrackingEnabled
    ? currentPhaseLabel(cyclesForPrediction, prediction, person.defaultPeriodLength, todayKey)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
      <div className="lg:basis-1/2">
        <PersonDetailsForm person={person} currentPhaseLabel={phaseLabel} />
      </div>
      {person.cycleTrackingEnabled && (
        <div className="lg:basis-1/2">
          <CycleLog
            personId={person.id}
            cycles={person.cycles.map((c) => ({
              id: c.id,
              startDate: c.startDate.toISOString(),
              endDate: c.endDate?.toISOString() ?? null,
              cycleLength: c.cycleLength,
              periodLength: c.periodLength,
              birthControlNotes: c.birthControlNotes,
              notes: c.notes,
              dayLogs: c.dayLogs.map((log) => ({
                id: log.id,
                date: log.date.toISOString(),
                flowIntensity: log.flowIntensity,
                symptoms: log.symptoms,
                basalBodyTemp: log.basalBodyTemp,
                ovulationTestResult: log.ovulationTestResult,
                notes: log.notes,
              })),
            }))}
            defaultCycleLength={person.defaultCycleLength}
            defaultPeriodLength={person.defaultPeriodLength}
          />
        </div>
      )}
    </div>
  );
}
