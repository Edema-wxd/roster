import { prisma } from "@/lib/prisma";

export { SESSION_COOKIE, createSessionToken, verifySessionToken } from "@/lib/session";

export async function isValidLoginIdentifier(identifier: string): Promise<boolean> {
  const value = identifier.trim().toLowerCase();
  if (!value) return false;
  const admin = await prisma.adminUser.findUnique({ where: { identifier: value } });
  return admin !== null;
}

/** Creates the single admin identity. Throws if one already exists. */
export async function createAdminIdentity(identifier: string): Promise<void> {
  const value = identifier.trim().toLowerCase();
  if (!value) throw new Error("Enter an email or access code.");

  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    throw new Error("An account already exists. Please log in instead.");
  }

  await prisma.adminUser.create({ data: { identifier: value } });
}
