import { NextResponse } from "next/server";
import { getAllItems } from "@/lib/catalog";
import { getNotes } from "@/lib/notes";
import { getRespondents } from "@/lib/respondents";

export const runtime = "nodejs";

type Target = { id: string; title: string; type: "note" | "item" | "respondent"; phase?: string; kind?: string };

// 聚合所有可被 [[链接]] 的实体：笔记 + 史料条目 + 受访者
export async function GET() {
  const [items, notes, resp] = await Promise.all([getAllItems(), getNotes(), getRespondents()]);

  const targets: Target[] = [
    ...notes.map((n) => ({ id: n.id, title: n.title, type: "note" as const })),
    ...items.map((i) => ({ id: i.id, title: i.title, type: "item" as const, phase: i.phase, kind: i.kind })),
    ...resp.map((r) => ({ id: r.code ?? r.id, title: r.name || r.code || r.id, type: "respondent" as const })),
  ].filter((t) => t.title);

  return NextResponse.json({ targets });
}
