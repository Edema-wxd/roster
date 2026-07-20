// Resource-ownership checks for multi-tenant scoping (Project.md §6). Every
// Server Action that mutates a specific record by id must call the matching
// assertion here first — list queries can filter by ownerId directly, but a
// single-record mutation has to verify the id it was handed actually belongs
// to the caller, or one account could edit/delete another's data by id.

import { prisma } from "@/lib/prisma";

export async function assertOwnsPeople(ownerId: string, personIds: string[]): Promise<void> {
  if (personIds.length === 0) return;
  const count = await prisma.person.count({ where: { id: { in: personIds }, ownerId } });
  if (count !== new Set(personIds).size) {
    throw new Error("One or more people weren't found.");
  }
}

export async function assertOwnsPerson(ownerId: string, personId: string): Promise<void> {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person || person.ownerId !== ownerId) {
    throw new Error("Person not found.");
  }
}

export async function assertOwnsVisit(ownerId: string, visitId: string): Promise<void> {
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.ownerId !== ownerId) {
    throw new Error("Visit not found.");
  }
}

export async function assertOwnsCycle(ownerId: string, cycleId: string): Promise<void> {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: { person: true },
  });
  if (!cycle || cycle.person.ownerId !== ownerId) {
    throw new Error("Cycle not found.");
  }
}

export async function assertOwnsCycleDayLog(ownerId: string, dayLogId: string): Promise<void> {
  const log = await prisma.cycleDayLog.findUnique({
    where: { id: dayLogId },
    include: { cycle: { include: { person: true } } },
  });
  if (!log || log.cycle.person.ownerId !== ownerId) {
    throw new Error("Day log not found.");
  }
}

export async function assertOwnsIntimacyEntry(ownerId: string, entryId: string): Promise<void> {
  const entry = await prisma.intimacyEntry.findUnique({
    where: { id: entryId },
    include: { person: true },
  });
  if (!entry || entry.person.ownerId !== ownerId) {
    throw new Error("Entry not found.");
  }
}
