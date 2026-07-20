import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  setPinForLegacyAccount,
  toClientError,
  SESSION_COOKIE,
} from "@/lib/auth";

// One-time PIN setup for an account that predates PIN login (see
// multi_user_ownership migration). Reached from the login page when
// /api/auth/login reports needsPinSetup for the entered identifier.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";

  let userId: string;
  try {
    const result = await setPinForLegacyAccount(identifier, pin);
    userId = result.userId;
  } catch (err) {
    const { message, status } = toClientError(err);
    return NextResponse.json({ error: message }, { status });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
