import { NextResponse } from "next/server";
import { addProject } from "@/lib/respondents";
import type { RespondentProject, RespVariable } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const p: RespondentProject = {
    id: crypto.randomUUID(),
    name: String(b.name ?? "").trim() || "New project",
    variables: Array.isArray(b.variables) ? (b.variables as RespVariable[]) : [],
  };
  await addProject(p);
  return NextResponse.json({ project: p });
}
