import { NextResponse } from "next/server";
import { updateRespondent, deleteRespondent } from "@/lib/respondents";
import type { Respondent } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const patch: Partial<Omit<Respondent, "id">> = {};
  if (typeof b.name === "string") patch.name = b.name.trim() || "Unnamed";
  if (typeof b.code === "string") patch.code = b.code;
  if (typeof b.project === "string") patch.project = b.project;
  if (b.values && typeof b.values === "object") patch.values = b.values as Respondent["values"];
  if (Array.isArray(b.themes)) patch.themes = (b.themes as unknown[]).map(String);
  if (typeof b.notes === "string") patch.notes = b.notes;
  if (typeof b.followup === "string") patch.followup = b.followup;
  if (typeof b.remarks === "string") patch.remarks = b.remarks;
  if ("transcriptId" in b) patch.transcriptId = b.transcriptId ? String(b.transcriptId) : null;
  if (Array.isArray(b.materials)) patch.materials = b.materials as Respondent["materials"];
  const r = await updateRespondent(id, patch);
  if (!r) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ respondent: r });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteRespondent(id);
  return NextResponse.json({ ok });
}
