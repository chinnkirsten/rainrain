import { NextResponse } from "next/server";
import { deleteEvidence, updateEvidence } from "@/lib/catalog";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof b.quote === "string") patch.quote = b.quote;
  if (typeof b.note === "string") patch.note = b.note;
  if (typeof b.page === "string") patch.page = b.page;
  if (Array.isArray(b.tags)) patch.tags = b.tags.map((x) => String(x).trim()).filter(Boolean);
  else if (typeof b.tags === "string")
    patch.tags = b.tags.split(",").map((x) => x.trim()).filter(Boolean);
  const updated = await updateEvidence(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ excerpt: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteEvidence(id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
