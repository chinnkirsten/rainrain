import { NextResponse } from "next/server";
import { deleteLogEntry } from "@/lib/research-log";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteLogEntry(id);
  return NextResponse.json({ ok });
}
