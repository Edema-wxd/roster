import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "roster_session";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSessionToken(userId: string): string {
  const payload = `user.${userId}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the signed-in user's id, or null if the token is missing/invalid. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expected = sign(payload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  const parts = payload.split(".");
  if (parts.length !== 3 || parts[0] !== "user") return null;
  return parts[1];
}
