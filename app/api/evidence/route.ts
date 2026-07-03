import { NextResponse } from "next/server";
import { addEvidence, getEvidence, getItemById } from "@/lib/catalog";
import type { Excerpt } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  let all = await getEvidence();
  if (itemId) all = all.filter((e) => e.itemId === itemId);
  return NextResponse.json({ evidence: all });
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const quote = String(b.quote ?? "").trim();
  const itemId = String(b.itemId ?? "");
  if (!quote || !itemId) {
    return NextResponse.json({ error: "Missing quote or source." }, { status: 400 });
  }
  const tags = Array.isArray(b.tags)
    ? (b.tags as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : typeof b.tags === "string"
      ? b.tags.split(",").map((x) => x.trim()).filter(Boolean)
      : [];

  // 来源字段优先用客户端传来的（已脱壳）；缺失则按 itemId 从目录回填，保证不产生孤立证据
  const src = b.itemTitle ? null : await getItemById(itemId);
  const e: Excerpt = {
    id: crypto.randomUUID(),
    itemId,
    itemTitle: String(b.itemTitle ?? src?.title ?? ""),
    itemKind: (b.itemKind as Excerpt["itemKind"]) ?? src?.kind ?? "other",
    phase: (b.phase as Excerpt["phase"]) ?? src?.phase ?? "phd",
    year: b.year ? String(b.year) : src?.year ?? undefined,
    quote,
    note: b.note ? String(b.note) : undefined,
    tags,
    page: b.page ? String(b.page) : undefined,
    createdAt: new Date().toISOString(),
  };
  await addEvidence(e);
  return NextResponse.json({ excerpt: e });
}
