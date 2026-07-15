"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addPerson(input: {
  name: string;
  color: string;
  defaultCycleLength: number;
  defaultPeriodLength: number;
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
      defaultCycleLength: input.defaultCycleLength,
      defaultPeriodLength: input.defaultPeriodLength,
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
