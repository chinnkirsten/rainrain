import { NextResponse } from "next/server";
import { addReading, getReadings } from "@/lib/catalog";
import type { Reading } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ readings: await getReadings() });
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const citation = String(b.citation ?? "").trim();
  if (!citation) return NextResponse.json({ error: "Missing citation." }, { status: 400 });
  const tags = Array.isArray(b.tags)
    ? (b.tags as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : typeof b.tags === "string"
      ? b.tags.split(",").map((x) => x.trim()).filter(Boolean)
      : [];
  const ymatch = /(\d{4})/.exec(citation);
  const r: Reading = {
    id: crypto.randomUUID(),
    citation,
    year: b.year ? String(b.year) : ymatch ? ymatch[1] : undefined,
    tags,
    note: b.note ? String(b.note) : undefined,
    read: b.read === false ? false : true,
    phase: b.phase ? String(b.phase) : undefined,
    createdAt: new Date().toISOString(),
  };
  await addReading(r);
  return NextResponse.json({ reading: r });
}
