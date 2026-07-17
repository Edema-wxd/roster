"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Gender } from "@/generated/prisma/enums";

export async function addPerson(input: {
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
}): Promise<{ id: string }> {
  if (!input.name.trim()) {
    throw new Error("Name is required.");
  }
  const person = await prisma.person.create({
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
  revalidatePath("/people");
  return { id: person.id };
}

export async function archivePerson(id: string) {
  await prisma.person.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/people");
}
