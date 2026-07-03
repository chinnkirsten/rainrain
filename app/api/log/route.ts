import { NextResponse } from "next/server";
import { getLog, addLogEntry } from "@/lib/research-log";
import type { LogKind } from "@/lib/types";

export const runtime = "nodejs";

// 手动只能记 memo / decision / reflexivity；"auto" 只由系统写。
const KINDS: LogKind[] = ["memo", "decision", "reflexivity"];

export async function GET() {
  return NextResponse.json({ entries: await getLog() });
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const body = String(b.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "Empty entry." }, { status: 400 });
  const kind = KINDS.includes(b.kind as LogKind) ? (b.kind as LogKind) : "memo";
  const entry = await addLogEntry(kind, body);
  return NextResponse.json({ entry });
}
