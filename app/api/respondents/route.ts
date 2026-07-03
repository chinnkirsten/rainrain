import { NextResponse } from "next/server";
import { getProjects, getRespondents, addRespondent } from "@/lib/respondents";
import type { Respondent } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const [projects, respondents] = await Promise.all([getProjects(), getRespondents()]);
  return NextResponse.json({ projects, respondents });
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const project = String(b.project ?? "");
  if (!project) return NextResponse.json({ error: "project required" }, { status: 400 });
  const r: Respondent = {
    id: crypto.randomUUID(),
    project,
    code: b.code ? String(b.code) : undefined,
    name: String(b.name ?? "").trim() || "Unnamed",
    values: b.values && typeof b.values === "object" ? (b.values as Respondent["values"]) : {},
    themes: Array.isArray(b.themes) ? (b.themes as unknown[]).map(String) : undefined,
    notes: b.notes ? String(b.notes) : undefined,
    followup: b.followup ? String(b.followup) : undefined,
    remarks: b.remarks ? String(b.remarks) : undefined,
    transcriptId: b.transcriptId ? String(b.transcriptId) : null,
    materials: Array.isArray(b.materials) ? (b.materials as Respondent["materials"]) : [],
  };
  await addRespondent(r);
  return NextResponse.json({ respondent: r });
}
