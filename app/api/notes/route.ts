import { NextResponse } from "next/server";
import { getNotes, addNote } from "@/lib/notes";
import type { Note } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ notes: await getNotes() });
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const note: Note = {
    id: crypto.randomUUID(),
    title: (String(b.title ?? "").trim() || "Untitled note"),
    body: String(b.body ?? ""),
    createdAt: now,
    updatedAt: now,
  };
  await addNote(note);
  return NextResponse.json({ note });
}
