import { NextResponse } from "next/server";
import { renameTag } from "@/lib/catalog";

export const runtime = "nodejs";

// 标签管理：op="rename" {from,to} 重命名/合并；op="delete" {from} 删除。作用于全部条目。
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const op = String(b.op ?? "");
  const from = String(b.from ?? "").trim();
  const to = op === "delete" ? "" : String(b.to ?? "").trim();
  if (!from) return NextResponse.json({ error: "missing tag" }, { status: 400 });
  const changed = await renameTag(from, to);
  return NextResponse.json({ ok: true, changed });
}
