"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addVisit(input: {
  date: string;
  type: "VISIT" | "APPOINTMENT";
  personIds: string[];
  notes?: string;
}) {
  if (input.personIds.length === 0) {
    throw new Error("Select at least one person.");
  }
  await prisma.visit.create({
    data: {
      scheduledAt: new Date(input.date),
      type: input.type,
      notes: input.notes?.trim() || null,
      people: {
        create: input.personIds.map((personId) => ({ personId })),
      },
    },
  });
  revalidatePath("/dashboard");
}

export async function deleteVisit(id: string) {
  await prisma.visit.delete({ where: { id } });
  revalidatePath("/dashboard");
}

export async function addIntimacyEntry(input: {
  date: string;
  personId: string;
  protected: boolean;
  notes?: string;
}) {
  if (!input.personId) {
    throw new Error("Select a person.");
  }
  await prisma.intimacyEntry.create({
    data: {
      date: new Date(input.date),
      personId: input.personId,
      protected: input.protected,
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath("/dashboard");
}

export async function deleteIntimacyEntry(id: string) {
  await prisma.intimacyEntry.delete({ where: { id } });
  revalidatePath("/dashboard");
}
