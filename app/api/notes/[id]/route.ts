import { NextResponse } from "next/server";
import { updateNote, deleteNote } from "@/lib/notes";
import type { Note } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const patch: Partial<Pick<Note, "title" | "body">> = {};
  if (typeof b.title === "string") patch.title = b.title.trim() || "Untitled note";
  if (typeof b.body === "string") patch.body = b.body;
  const note = await updateNote(id, patch);
  if (!note) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ note });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteNote(id);
  return NextResponse.json({ ok });
}
