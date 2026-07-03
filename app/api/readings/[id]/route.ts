import { NextResponse } from "next/server";
import { updateReading, deleteReading } from "@/lib/catalog";
import { composeCitation, type RefInput } from "@/lib/reference";

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
  // 结构化著录字段
  for (const k of ["type", "title", "container", "publisher", "volume", "issue", "pages", "doi", "url"] as const) {
    if (typeof b[k] === "string") patch[k] = (b[k] as string).trim() || undefined;
  }
  if (Array.isArray(b.authors))
    patch.authors = b.authors.map((x) => String(x).trim()).filter(Boolean);
  else if (typeof b.authors === "string")
    patch.authors = b.authors.split(/[;\n]|\band\b/).map((x) => x.trim()).filter(Boolean);

  // 有结构化标题时，让展示/搜索用的 citation 跟随结构化字段重算；否则不要用空串覆盖既有题录
  if (typeof patch.title === "string" && patch.title) patch.citation = composeCitation(patch as RefInput);
  else if (patch.citation === "") delete patch.citation;

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
