import { NextResponse } from "next/server";
import { loadPhases, savePhases } from "@/lib/structure";
import { blobConfigured } from "@/lib/catalog";
import { logEvent } from "@/lib/research-log";
import { LANG } from "@/lib/i18n";
import type { Phase } from "@/lib/phases";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ phases: await loadPhases() });
}

export async function PUT(req: Request) {
  if (blobConfigured()) {
    return NextResponse.json(
      { error: "Editing the structure isn't available in the cloud preview — use the local edition." },
      { status: 400 },
    );
  }
  let b: { phases?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!Array.isArray(b.phases)) {
    return NextResponse.json({ error: "phases must be an array." }, { status: 400 });
  }
  const out: Phase[] = [];
  for (const p of b.phases as Record<string, unknown>[]) {
    const id = String(p.id ?? "").trim();
    const title = String(p.title ?? "").trim();
    if (!id || !title) continue;
    out.push({
      id,
      title,
      titleEn: String(p.titleEn ?? ""),
      period: String(p.period ?? ""),
      tagline: String(p.tagline ?? ""),
      intro: String(p.intro ?? ""),
      accent: String(p.accent ?? "#7c2d2d"),
      featured: !!p.featured,
      parent: p.parent ? String(p.parent) : undefined,
    });
  }
  if (!out.length) return NextResponse.json({ error: "No valid phases." }, { status: 400 });
  await savePhases(out);
  await logEvent(
    LANG === "zh" ? "编辑了研究结构（阶段 / 子课题）" : "Edited the research structure (stages / sub-topics)",
  );
  return NextResponse.json({ ok: true, phases: out });
}
