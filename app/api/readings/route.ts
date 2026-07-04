import { NextResponse } from "next/server";
import { addReading, getReadings } from "@/lib/catalog";
import { formatCitation } from "@/lib/ref-format";
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
  };

  // year：优先显式字段，否则沿用「从用户提交的原始 citation 文本里提年份」的既有逻辑
  // （若走下面的 formatCitation 自动生成分支，生成串本就不含年份之外的信息，regex 无需对它跑）
  const rawCitation = String(b.citation ?? "").trim();
  const ymatch = /(\d{4})/.exec(rawCitation);
  const year = str(b.year) ?? (ymatch ? ymatch[1] : undefined);

  const r: Reading = {
    id: crypto.randomUUID(),
    citation: rawCitation,
    tags,
    note: str(b.note),
    read: b.read === false ? false : true,
    phase: str(b.phase),
    createdAt: new Date().toISOString(),
    ...structured,
    year,
  };
  // 未提供 citation 但有 title：用结构化字段合成一条规范 GB/T 7714 题录存起来
  if (!r.citation && r.title) r.citation = formatCitation(r, "gb");
  if (!r.citation) return NextResponse.json({ error: "Missing citation." }, { status: 400 });

  await addReading(r);
  return NextResponse.json({ reading: r });
}
