import { NextRequest, NextResponse } from "next/server";
import { getAllItems, toPublicItem, getReadings, getEvidence } from "@/lib/catalog";
import { getNotes } from "@/lib/notes";
import { getRespondents } from "@/lib/respondents";
import { getLog } from "@/lib/research-log";

export const runtime = "nodejs";

const MAX_PER_GROUP = 6;

type Hit = { id: string; title: string; sub?: string; href: string };
type Group = { key: "items" | "readings" | "notes" | "evidence" | "respondents" | "log"; hits: Hit[] };

const norm = (s: string) => s.toLowerCase();
const includes = (hay: string | undefined | null, needle: string) =>
  !!hay && norm(hay).includes(needle);
const clip = (s: string, n = 80) => (s.length > n ? s.slice(0, n) : s);

export async function GET(req: NextRequest) {
  const q = norm((req.nextUrl.searchParams.get("q") ?? "").trim());
  if (q.length < 2) return NextResponse.json({ groups: [] });

  const groups: Group[] = [];

  // 馆藏条目
  const items = (await getAllItems())
    .filter((i) => !i.deletedAt)
    .map(toPublicItem)
    .filter(
      (i) =>
        includes(i.title, q) ||
        includes(i.description, q) ||
        includes(i.author, q) ||
        (i.tags ?? []).some((tg) => includes(tg, q)),
    )
    .slice(0, MAX_PER_GROUP)
    .map((i) => ({
      id: i.id,
      title: clip(i.title),
      sub: i.year,
      href: `/research/${i.phase}`,
    }));
  if (items.length) groups.push({ key: "items", hits: items });

  // 文献
  const readings = (await getReadings())
    .filter(
      (r) =>
        includes(r.citation, q) ||
        includes(r.title, q) ||
        includes(r.note, q) ||
        (r.tags ?? []).some((tg) => includes(tg, q)) ||
        (r.authors ?? []).some((a) => includes(a, q)),
    )
    .slice(0, MAX_PER_GROUP)
    .map((r) => ({
      id: r.id,
      title: clip(r.title || r.citation),
      sub: r.year,
      href: "/readings",
    }));
  if (readings.length) groups.push({ key: "readings", hits: readings });

  // 笔记
  const notes = (await getNotes())
    .filter((n) => includes(n.title, q) || includes(n.body, q))
    .slice(0, MAX_PER_GROUP)
    .map((n) => ({ id: n.id, title: clip(n.title), href: "/notes" }));
  if (notes.length) groups.push({ key: "notes", hits: notes });

  // 证据
  const evidence = (await getEvidence())
    .filter(
      (e) =>
        includes(e.quote, q) ||
        includes(e.note, q) ||
        includes(e.itemTitle, q) ||
        (e.tags ?? []).some((tg) => includes(tg, q)),
    )
    .slice(0, MAX_PER_GROUP)
    .map((e) => ({
      id: e.id,
      title: clip(e.quote),
      sub: e.itemTitle,
      href: "/evidence",
    }));
  if (evidence.length) groups.push({ key: "evidence", hits: evidence });

  // 受访者
  const respondents = (await getRespondents())
    .filter(
      (r) =>
        includes(r.name, q) ||
        includes(r.code, q) ||
        Object.values(r.values ?? {}).some((v) => typeof v === "string" && includes(v, q)),
    )
    .slice(0, MAX_PER_GROUP)
    .map((r) => ({
      id: r.id,
      title: clip(r.name),
      sub: r.code,
      href: "/respondents",
    }));
  if (respondents.length) groups.push({ key: "respondents", hits: respondents });

  // 研究日志
  const log = (await getLog())
    .filter((l) => includes(l.body, q))
    .slice(0, MAX_PER_GROUP)
    .map((l) => ({ id: l.id, title: clip(l.body), href: "/log" }));
  if (log.length) groups.push({ key: "log", hits: log });

  return NextResponse.json({ groups });
}
