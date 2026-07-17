"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { VisitStatus, VisitType } from "@/generated/prisma/enums";

// Time is stored as the literal wall-clock value written in the form, always
// in UTC regardless of viewer timezone — matches this app's existing
// "date keys are timezone-agnostic" convention (src/lib/cycle.ts) so a visit
// logged for 3pm reads back as 3pm no matter where it's viewed from.
function toScheduledAt(date: string, time?: string): Date {
  return new Date(`${date}T${time && time.length > 0 ? time : "00:00"}:00.000Z`);
}

export async function addVisit(input: {
  date: string;
  time?: string;
  type: VisitType;
  personIds: string[];
  notes?: string;
}) {
  if (input.personIds.length === 0) {
    throw new Error("Select at least one person.");
  }
  await prisma.visit.create({
    data: {
      scheduledAt: toScheduledAt(input.date, input.time),
      type: input.type,
      notes: input.notes?.trim() || null,
      people: {
        create: input.personIds.map((personId) => ({ personId })),
      },
    },
  });
  revalidatePath("/dashboard");
}

export async function updateVisit(
  id: string,
  input: {
    date: string;
    time?: string;
    type: VisitType;
    status: VisitStatus;
    personIds: string[];
    notes?: string;
  },
) {
  if (input.personIds.length === 0) {
    throw new Error("Select at least one person.");
  }
  await prisma.visit.update({
    where: { id },
    data: {
      scheduledAt: toScheduledAt(input.date, input.time),
      type: input.type,
      status: input.status,
      notes: input.notes?.trim() || null,
      people: {
        deleteMany: {},
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
