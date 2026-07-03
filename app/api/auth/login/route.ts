import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let password = "";
  let remember = false;
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
    remember = body?.remember === true;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!(await verifyPassword(password))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // remember === true -> persistent 30-day cookie; otherwise a session
    // cookie that the browser drops on close (no maxAge/expires set).
    ...(remember ? { maxAge: SESSION_MAX_AGE } : {}),
  });
  return res;
}
