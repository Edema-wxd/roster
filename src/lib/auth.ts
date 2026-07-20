import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Thrown for expected, user-facing problems (bad input, taken identifier,
 * account not found) — the message is safe to show as-is. Anything else
 * thrown from this module (a DB connection error, etc.) is NOT an AuthError
 * and callers should show a generic message instead of its raw text, since
 * it might contain internal detail — see the API routes under
 * src/app/api/auth/*, which all follow this same catch pattern.
 */
export class AuthError extends Error {}

const GENERIC_ERROR_MESSAGE = "Something went wrong. Try again.";

/** Shared by every route under src/app/api/auth/*: AuthError messages are
 * safe to show verbatim; anything else is logged server-side (so it's still
 * debuggable) and replaced with a generic message so internals never leak
 * to the client. */
export function toClientError(err: unknown): { message: string; status: number } {
  if (err instanceof AuthError) {
    return { message: err.message, status: 400 };
  }
  console.error("Unexpected auth error:", err);
  return { message: GENERIC_ERROR_MESSAGE, status: 500 };
}

export { SESSION_COOKIE, createSessionToken, verifySessionToken } from "@/lib/session";

/** The signed-in account's id, from the session cookie — null if not signed in. */
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Same as getCurrentUserId, but throws — for Server Actions/Components that
 * are already behind middleware and should never actually hit this. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not signed in.");
  return userId;
}

/** True if the signed-in account holds the SUPER_ADMIN role (e.g. can read
 * and respond to feedback from every account — see feedback/actions.ts). */
export async function isSuperAdmin(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "SUPER_ADMIN";
}

/** Same as isSuperAdmin, but throws — for Server Actions that manage
 * feedback on behalf of every account and must never run for a regular user. */
export async function requireSuperAdmin(): Promise<string> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "SUPER_ADMIN") throw new Error("Not authorized.");
  return userId;
}

const PIN_PATTERN = /^\d{4,6}$/;
const MAX_IDENTIFIER_LENGTH = 200;

function validatePinFormat(pin: string): void {
  if (!PIN_PATTERN.test(pin)) {
    throw new AuthError("PIN must be 4 to 6 digits.");
  }
}

function validateIdentifier(value: string): void {
  if (!value) throw new AuthError("Enter an email or username.");
  if (value.length > MAX_IDENTIFIER_LENGTH) {
    throw new AuthError("That email or username is too long.");
  }
}

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPinHash(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

const DUPLICATE_IDENTIFIER_MESSAGE = "That email or username is already taken.";

/** Creates a new account. Throws AuthError if the identifier's taken or the PIN is malformed. */
export async function createUserAccount(
  identifier: string,
  pin: string,
): Promise<{ id: string }> {
  const value = normalizeIdentifier(identifier);
  validateIdentifier(value);
  validatePinFormat(pin);

  const existing = await prisma.user.findUnique({ where: { identifier: value } });
  if (existing) {
    throw new AuthError(DUPLICATE_IDENTIFIER_MESSAGE);
  }

  try {
    const user = await prisma.user.create({
      data: { identifier: value, pinHash: hashPin(pin) },
    });
    return { id: user.id };
  } catch (err) {
    // Two signups for the same identifier landing at once can both pass the
    // findUnique check above before either commits — the unique constraint
    // is the real guard, this just turns that race into the same friendly
    // message instead of a raw Prisma error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AuthError(DUPLICATE_IDENTIFIER_MESSAGE);
    }
    throw err;
  }
}

export type LoginResult =
  | { status: "ok"; userId: string }
  | { status: "needs-pin-setup"; userId: string }
  | { status: "invalid" };

/**
 * Verifies identifier + PIN. An account created before PIN login existed has
 * `pinHash: null` — that's reported as "needs-pin-setup" so the login page
 * can prompt to set one instead of comparing against nothing (see the
 * multi_user_ownership migration, which backfilled the original single-admin
 * account without inventing a PIN on its behalf).
 */
export async function verifyLogin(identifier: string, pin: string): Promise<LoginResult> {
  const value = normalizeIdentifier(identifier);
  if (!value) return { status: "invalid" };

  const user = await prisma.user.findUnique({ where: { identifier: value } });
  if (!user) return { status: "invalid" };

  if (!user.pinHash) return { status: "needs-pin-setup", userId: user.id };

  if (!PIN_PATTERN.test(pin) || !verifyPinHash(pin, user.pinHash)) {
    return { status: "invalid" };
  }
  return { status: "ok", userId: user.id };
}

/** One-time PIN setup for an account migrated from the pre-PIN single-admin model. */
export async function setPinForLegacyAccount(
  identifier: string,
  pin: string,
): Promise<{ userId: string }> {
  const value = normalizeIdentifier(identifier);
  validateIdentifier(value);
  validatePinFormat(pin);

  const user = await prisma.user.findUnique({ where: { identifier: value } });
  if (!user) throw new AuthError("That email or username isn't recognized.");
  if (user.pinHash) throw new AuthError("This account already has a PIN. Log in instead.");

  await prisma.user.update({ where: { id: user.id }, data: { pinHash: hashPin(pin) } });
  return { userId: user.id };
}
