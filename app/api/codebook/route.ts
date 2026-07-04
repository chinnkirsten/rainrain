import { NextResponse } from "next/server";
import { getCodebook, saveCodebook, type CodeDef } from "@/lib/codebook";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ defs: await getCodebook() });
}

export async function PUT(req: Request) {
  let b: { defs?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!Array.isArray(b.defs)) return NextResponse.json({ error: "Missing defs." }, { status: 400 });
  const defs: CodeDef[] = (b.defs as Record<string, unknown>[])
    .map((d) => ({
      tag: String(d.tag ?? "").trim(),
      definition: d.definition ? String(d.definition) : undefined,
      parent: d.parent ? String(d.parent) : undefined,
    }))
    .filter((d) => d.tag);
  await saveCodebook(defs);
  return NextResponse.json({ defs });
}
