import { NextResponse } from "next/server";
import { deleteItem, getItemById, toPublicItem, updateItem } from "@/lib/catalog";
import { loadPhases } from "@/lib/structure";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ item: toPublicItem(item) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.year === "string") patch.year = body.year;
  if (typeof body.phase === "string" && (await loadPhases()).some((p) => p.id === body.phase))
    patch.phase = body.phase;
  for (const k of ["author", "publisher", "archive", "callNumber", "edition"]) {
    if (typeof body[k] === "string") patch[k] = body[k];
  }
  if (Array.isArray(body.tags))
    patch.tags = body.tags.map((t) => String(t).trim()).filter(Boolean);
  else if (typeof body.tags === "string")
    patch.tags = body.tags.split(",").map((t) => t.trim()).filter(Boolean);

  const updated = await updateItem(id, patch);
  if (!updated) {
    return NextResponse.json(
      { error: "Item not found, or it is built-in seed content (not editable here)." },
      { status: 404 },
    );
  }
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const removed = await deleteItem(id);
  if (!removed) {
    return NextResponse.json(
      { error: "Item not found, or it is built-in seed content (not deletable here)." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
