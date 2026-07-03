import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getAllItems } from "@/lib/catalog";
import { normalize } from "@/lib/cjk";

export const runtime = "nodejs";

const TEXT_DIR = path.join(process.cwd(), "storage", "text");

type Entry = {
  id: string;
  titleNorm: string;
  metaNorm: string;
  contentNorm: string;
  contentRaw: string;
};

// 每个文本文件按 mtime 缓存归一结果，避免重复转换
const fileCache = new Map<string, { mtime: number; norm: string; raw: string }>();
let INDEX: Entry[] | null = null;
let INDEX_AT = 0;

async function buildIndex(): Promise<Entry[]> {
  if (INDEX && Date.now() - INDEX_AT < 60_000) return INDEX;
  const items = await getAllItems();
  const out: Entry[] = [];
  for (const it of items) {
    const metaSrc = [
      it.title, ...(it.tags ?? []), it.filename, it.year,
      it.author, it.publisher, it.archive, it.callNumber,
    ]
      .filter(Boolean)
      .join(" ");
    let raw = "";
    let norm = "";
    try {
      const fp = path.join(TEXT_DIR, `${it.id}.txt`);
      const st = await fs.stat(fp);
      const cached = fileCache.get(it.id);
      if (cached && cached.mtime === st.mtimeMs) {
        raw = cached.raw;
        norm = cached.norm;
      } else {
        raw = await fs.readFile(fp, "utf8");
        norm = normalize(raw);
        fileCache.set(it.id, { mtime: st.mtimeMs, norm, raw });
      }
    } catch {}
    out.push({
      id: it.id,
      titleNorm: normalize(it.title),
      metaNorm: normalize(metaSrc),
      contentNorm: norm,
      contentRaw: raw,
    });
  }
  INDEX = out;
  INDEX_AT = Date.now();
  return out;
}

function snippet(raw: string, norm: string, termRaw: string, termNorm: string): string {
  let src = raw;
  let at = raw ? raw.toLowerCase().indexOf(termRaw.toLowerCase()) : -1;
  if (at < 0) {
    src = norm;
    at = norm.indexOf(termNorm);
  }
  if (at < 0 || !src) return "";
  const start = Math.max(0, at - 34);
  const end = Math.min(src.length, at + termNorm.length + 60);
  let s = src.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) s = "…" + s;
  if (end < src.length) s += "…";
  return s;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("q") || "").trim();
  if (!raw) return NextResponse.json({ matches: [] });

  const terms = raw
    .split(/\s+/)
    .map((tRaw) => ({ raw: tRaw, norm: normalize(tRaw) }))
    .filter((t) => t.norm.length >= 1);
  if (!terms.length) return NextResponse.json({ matches: [] });
  const joinedNorm = normalize(raw);

  const index = await buildIndex();
  const matches: { id: string; snippet: string; score: number }[] = [];

  for (const e of index) {
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const inTitle = e.titleNorm.includes(term.norm);
      const inMeta = e.metaNorm.includes(term.norm);
      const cIdx = e.contentNorm.indexOf(term.norm);
      if (!inMeta && cIdx < 0) {
        ok = false;
        break;
      }
      if (inTitle) score += 6;
      else if (inMeta) score += 3;
      if (cIdx >= 0) {
        // 内容命中次数（封顶）
        let n = 0;
        let i = cIdx;
        while (i >= 0 && n < 8) {
          n++;
          i = e.contentNorm.indexOf(term.norm, i + term.norm.length);
        }
        score += n;
      }
    }
    if (!ok) continue;
    if (terms.length > 1) {
      if (e.metaNorm.includes(joinedNorm)) score += 10;
      else if (e.contentNorm.includes(joinedNorm)) score += 8;
    }
    matches.push({
      id: e.id,
      score,
      snippet: snippet(e.contentRaw, e.contentNorm, terms[0].raw, terms[0].norm),
    });
  }

  matches.sort((a, b) => b.score - a.score);
  return NextResponse.json({ matches: matches.slice(0, 400), indexed: index.length });
}
