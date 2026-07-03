import { NextResponse } from "next/server";
import { updateReading, deleteReading } from "@/lib/catalog";

export const runtime = "nodejs";

export async function PATCH(
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
  const patch: Record<string, unknown> = {};
  if (typeof b.citation === "string") patch.citation = b.citation;
  if (typeof b.year === "string") patch.year = b.year;
  if (typeof b.note === "string") patch.note = b.note;
  if (typeof b.read === "boolean") patch.read = b.read;
  if (typeof b.phase === "string") patch.phase = b.phase;
  if (Array.isArray(b.tags)) patch.tags = b.tags.map((x) => String(x).trim()).filter(Boolean);
  else if (typeof b.tags === "string")
    patch.tags = b.tags.split(",").map((x) => x.trim()).filter(Boolean);

  const updated = await updateReading(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ reading: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteReading(id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
