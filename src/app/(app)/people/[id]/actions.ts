"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updatePersonDetails(
  personId: string,
  input: {
    name: string;
    color: string;
    defaultCycleLength: number;
    defaultPeriodLength: number;
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
      defaultCycleLength: input.defaultCycleLength,
      defaultPeriodLength: input.defaultPeriodLength,
      notes: input.notes?.trim() || null,
      allergies: input.allergies?.trim() || null,
      foodPreferences: input.foodPreferences?.trim() || null,
    },
  });
  revalidatePath(`/people/${personId}`);
}

export async function addCycle(
  personId: string,
  input: {
    startDate: string;
    endDate?: string;
    cycleLength?: number;
    periodLength?: number;
    flowIntensity?: "LIGHT" | "MEDIUM" | "HEAVY";
    symptoms?: string[];
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
      flowIntensity: input.flowIntensity ?? null,
      symptoms: input.symptoms ?? [],
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath(`/people/${personId}`);
  revalidatePath("/dashboard");
}

export async function deleteCycle(personId: string, cycleId: string) {
  await prisma.cycle.delete({ where: { id: cycleId } });
  revalidatePath(`/people/${personId}`);
  revalidatePath("/dashboard");
}
