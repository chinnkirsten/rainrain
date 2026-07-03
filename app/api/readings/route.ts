import { NextResponse } from "next/server";
import { addReading, getReadings } from "@/lib/catalog";
import { composeCitation } from "@/lib/reference";
import type { Reading, RefType } from "@/lib/types";

export const runtime = "nodejs";

const REF_TYPES: RefType[] = ["article", "book", "chapter", "thesis", "report", "web", "other"];
const str = (v: unknown) => (v == null ? undefined : String(v).trim() || undefined);

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
  const tags = Array.isArray(b.tags)
    ? (b.tags as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : typeof b.tags === "string"
      ? b.tags.split(",").map((x) => x.trim()).filter(Boolean)
      : [];
  const authors = Array.isArray(b.authors)
    ? (b.authors as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : typeof b.authors === "string" && b.authors.trim()
      ? b.authors.split(/[;\n]|\band\b/).map((x) => x.trim()).filter(Boolean)
      : undefined;

  const type = REF_TYPES.includes(b.type as RefType) ? (b.type as RefType) : undefined;
  const structured = {
    type,
    authors: authors?.length ? authors : undefined,
    title: str(b.title),
    container: str(b.container),
    publisher: str(b.publisher),
    volume: str(b.volume),
    issue: str(b.issue),
    pages: str(b.pages),
    doi: str(b.doi),
    url: str(b.url),
    year: str(b.year),
  };

  const rawCitation = String(b.citation ?? "").trim();
  const citation = rawCitation || composeCitation({ ...structured, tags });
  if (!citation) return NextResponse.json({ error: "Missing citation." }, { status: 400 });

  const ymatch = /(\d{4})/.exec(citation);
  const { year: sy, ...restStructured } = structured;
  const r: Reading = {
    id: crypto.randomUUID(),
    citation,
    tags,
    note: str(b.note),
    read: b.read === false ? false : true,
    phase: str(b.phase),
    createdAt: new Date().toISOString(),
    ...restStructured,
    year: sy ?? (ymatch ? ymatch[1] : undefined),
  };
  await addReading(r);
  return NextResponse.json({ reading: r });
}
