import { NextResponse } from "next/server";
import { updateProject, deleteProject } from "@/lib/respondents";
import type { RespondentProject, RespVariable } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const patch: Partial<Pick<RespondentProject, "name" | "variables">> = {};
  if (typeof b.name === "string") patch.name = b.name.trim() || "Untitled project";
  if (Array.isArray(b.variables)) patch.variables = b.variables as RespVariable[];
  const p = await updateProject(id, patch);
  if (!p) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ project: p });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteProject(id);
  return NextResponse.json({ ok });
}
