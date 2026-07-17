"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computePrediction } from "@/lib/prediction";
import type {
  Gender,
  FlowIntensity,
  OvulationTestResult,
  Symptom,
} from "@/generated/prisma/enums";

async function recomputePersonPrediction(personId: string) {
  const [person, cycles] = await Promise.all([
    prisma.person.findUniqueOrThrow({ where: { id: personId } }),
    prisma.cycle.findMany({ where: { personId }, orderBy: { startDate: "asc" } }),
  ]);

  const prediction = computePrediction(
    cycles.map((c) => ({
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString() ?? null,
      cycleLength: c.cycleLength,
      periodLength: c.periodLength,
    })),
    person.defaultCycleLength,
    person.defaultPeriodLength,
    person.defaultLutealPhaseLength,
  );

  await prisma.person.update({
    where: { id: personId },
    data: {
      predictedCycleLength: prediction?.predictedCycleLength ?? null,
      predictedVariabilityDays: prediction?.predictedVariabilityDays ?? null,
      predictionLastCalculated: new Date(),
    },
  });
}

export async function updatePersonDetails(
  personId: string,
  input: {
    name: string;
    color: string;
    gender: Gender;
    cycleTrackingEnabled: boolean;
    defaultCycleLength: number;
    defaultPeriodLength: number;
    defaultLutealPhaseLength: number;
    notes?: string;
    allergies?: string;
    foodPreferences?: string;
  },
) {
  await prisma.person.update({
    where: { id: personId },
    data: {
      name: input.name.trim(),
      color: input.color,
      gender: input.gender,
      cycleTrackingEnabled: input.cycleTrackingEnabled,
      defaultCycleLength: input.defaultCycleLength,
      defaultPeriodLength: input.defaultPeriodLength,
      defaultLutealPhaseLength: input.defaultLutealPhaseLength,
      notes: input.notes?.trim() || null,
      allergies: input.allergies?.trim() || null,
      foodPreferences: input.foodPreferences?.trim() || null,
    },
  });
  await recomputePersonPrediction(personId);
  revalidatePath(`/people/${personId}`);
  revalidatePath("/dashboard");
}

export async function addCycle(
  personId: string,
  input: {
    startDate: string;
    endDate?: string;
    cycleLength?: number;
    periodLength?: number;
    birthControlNotes?: string;
    notes?: string;
  },
) {
  await prisma.cycle.create({
    data: {
      personId,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      cycleLength: input.cycleLength ?? null,
      periodLength: input.periodLength ?? null,
      birthControlNotes: input.birthControlNotes?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  await recomputePersonPrediction(personId);
  revalidatePath(`/people/${personId}`);
  revalidatePath("/dashboard");
}

export async function deleteCycle(personId: string, cycleId: string) {
  await prisma.cycle.delete({ where: { id: cycleId } });
  await recomputePersonPrediction(personId);
  revalidatePath(`/people/${personId}`);
  revalidatePath("/dashboard");
}

export async function addCycleDayLog(
  personId: string,
  cycleId: string,
  input: {
    date: string;
    flowIntensity?: FlowIntensity;
    symptoms: Symptom[];
    basalBodyTemp?: number;
    ovulationTestResult?: OvulationTestResult;
    notes?: string;
  },
) {
  await prisma.cycleDayLog.upsert({
    where: { cycleId_date: { cycleId, date: new Date(input.date) } },
    create: {
      cycleId,
      date: new Date(input.date),
      flowIntensity: input.flowIntensity ?? null,
      symptoms: input.symptoms,
      basalBodyTemp: input.basalBodyTemp ?? null,
      ovulationTestResult: input.ovulationTestResult ?? null,
      notes: input.notes?.trim() || null,
    },
    update: {
      flowIntensity: input.flowIntensity ?? null,
      symptoms: input.symptoms,
      basalBodyTemp: input.basalBodyTemp ?? null,
      ovulationTestResult: input.ovulationTestResult ?? null,
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath(`/people/${personId}`);
}

export async function deleteCycleDayLog(personId: string, dayLogId: string) {
  await prisma.cycleDayLog.delete({ where: { id: dayLogId } });
  revalidatePath(`/people/${personId}`);
}
