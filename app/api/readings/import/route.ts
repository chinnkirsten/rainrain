import { NextResponse } from "next/server";
import { addReading } from "@/lib/catalog";
import { crossrefToReading, parseCitations, composeCitation, type RefInput } from "@/lib/reference";
import type { Reading } from "@/lib/types";

export const runtime = "nodejs";

function toReading(input: RefInput, extra: { tags?: string[]; phase?: string }): Reading {
  const tags = [...new Set([...(input.tags ?? []), ...(extra.tags ?? [])])];
  return {
    id: crypto.randomUUID(),
    citation: input.citation || composeCitation(input),
    year: input.year,
    tags: tags.length ? tags : undefined,
    read: false,
    phase: extra.phase,
    createdAt: new Date().toISOString(),
    type: input.type,
    authors: input.authors,
    title: input.title,
    container: input.container,
    publisher: input.publisher,
    volume: input.volume,
    issue: input.issue,
    pages: input.pages,
    doi: input.doi,
    url: input.url,
  };
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const extraTags = Array.isArray(b.tags) ? b.tags.map((x) => String(x).trim()).filter(Boolean) : [];
  const phase = b.phase ? String(b.phase) : undefined;
  const extra = { tags: extraTags, phase };

  const doi = String(b.doi ?? "").trim();
  const text = String(b.text ?? "").trim();

  let inputs: RefInput[] = [];

  if (doi) {
    const clean = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
    try {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(clean)}`, {
        headers: { "User-Agent": "Rainrain-Research/0.1 (mailto:Kirstenchin1@outlook.com)" },
        cache: "no-store",
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: res.status === 404 ? "未找到该 DOI" : `CrossRef ${res.status}` },
          { status: 502 },
        );
      }
      const data = (await res.json()) as { message?: Record<string, unknown> };
      if (!data.message) return NextResponse.json({ error: "CrossRef 无数据" }, { status: 502 });
      inputs = [crossrefToReading(data.message)];
    } catch {
      return NextResponse.json({ error: "无法连接 CrossRef，请检查网络或改用 BibTeX 粘贴导入" }, { status: 502 });
    }
  } else if (text) {
    inputs = parseCitations(text);
  } else {
    return NextResponse.json({ error: "需要 doi 或 text" }, { status: 400 });
  }

  if (!inputs.length) return NextResponse.json({ error: "未解析到任何文献" }, { status: 422 });

  const readings: Reading[] = [];
  for (const input of inputs) {
    const r = toReading(input, extra);
    await addReading(r);
    readings.push(r);
  }
  return NextResponse.json({ readings });
}
