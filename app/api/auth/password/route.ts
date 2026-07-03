import { NextResponse } from "next/server";
import { verifyPassword, setPassword } from "@/lib/password";
import { blobConfigured } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (blobConfigured()) {
    return NextResponse.json(
      { error: "Changing the password isn't available in the cloud preview — use the local edition." },
      { status: 400 },
    );
  }
  let b: { current?: string; next?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const current = String(b.current ?? "");
  const next = String(b.next ?? "");
  if (next.length < 4) {
    return NextResponse.json({ error: "New password must be at least 4 characters." }, { status: 400 });
  }
  if (!(await verifyPassword(current))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }
  await setPassword(next);
  return NextResponse.json({ ok: true });
}
