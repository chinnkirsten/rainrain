import { NextResponse } from "next/server";
import { getAnonMap, saveAnonMap } from "@/lib/anon";
import { isLocalMode } from "@/lib/backup";
import type { AnonPair } from "@/lib/anon-util";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ pairs: await getAnonMap() });
}

export async function PUT(req: Request) {
  if (!isLocalMode()) {
    return NextResponse.json(
      { error: "Editing the anonymisation map isn't available in the cloud preview — use the local edition." },
      { status: 400 },
    );
  }
  let b: { pairs?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!Array.isArray(b.pairs)) {
    return NextResponse.json({ error: "pairs must be an array." }, { status: 400 });
  }
  const pairs: AnonPair[] = (b.pairs as Record<string, unknown>[])
    .map((p) => ({ from: String(p.from ?? "").trim(), to: String(p.to ?? "").trim() }))
    .filter((p) => p.from);
  await saveAnonMap(pairs);
  return NextResponse.json({ ok: true, pairs });
}
