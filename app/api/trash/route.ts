import { NextResponse } from "next/server";
import { getTrashItems, emptyTrash, toPublicItem } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  const items = (await getTrashItems()).map(toPublicItem);
  return NextResponse.json({ items });
}

export async function DELETE() {
  const purged = await emptyTrash();
  return NextResponse.json({ ok: true, purged });
}
