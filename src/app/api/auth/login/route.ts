import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, verifyLogin, toClientError, SESSION_COOKIE } from "@/lib/auth";
import type { LoginResult } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";

  let result: LoginResult;
  try {
    result = await verifyLogin(identifier, pin);
  } catch (err) {
    const { message, status } = toClientError(err);
    return NextResponse.json({ error: message }, { status });
  }

  if (result.status === "invalid") {
    return NextResponse.json(
      { error: "That email/username or PIN isn't right." },
      { status: 401 },
    );
  }

  if (result.status === "needs-pin-setup") {
    // Pre-existing account from before PIN login existed (see the
    // multi_user_ownership migration) — no PIN to check yet.
    return NextResponse.json({ needsPinSetup: true });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(result.userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
