import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createBackup, isLocalMode } from "@/lib/backup";

export const runtime = "nodejs";
export const maxDuration = 300;

// GET：生成并直接下载一个 storage/ 的 zip 备份
export async function GET() {
  if (!isLocalMode()) {
    return NextResponse.json(
      { error: "Cloud mode stores data in Blob; one-click backup is for the local edition only." },
      { status: 400 },
    );
  }
  const r = await createBackup(new Date());
  const buf = await fs.readFile(path.join(process.cwd(), r.file));
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${path.basename(r.file)}"`,
    },
  });
}

export async function POST() {
  if (!isLocalMode()) {
    return NextResponse.json(
      { error: "Cloud mode stores data in Blob; one-click backup is for the local edition only." },
      { status: 400 },
    );
  }
  try {
    const r = await createBackup(new Date());
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
