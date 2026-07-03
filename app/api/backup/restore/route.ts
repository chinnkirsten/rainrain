import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import { isLocalMode } from "@/lib/backup";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST：上传一个之前导出的 .zip 备份，解压覆盖回 storage/。
export async function POST(req: Request) {
  if (!isLocalMode()) {
    return NextResponse.json({ error: "Restore is for the local edition only." }, { status: 400 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Not a valid .zip backup." }, { status: 400 });
  }
  const STORAGE = path.join(process.cwd(), "storage");
  await fs.mkdir(STORAGE, { recursive: true });
  let count = 0;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const dest = path.join(STORAGE, entry.name);
    if (dest !== STORAGE && !dest.startsWith(STORAGE + path.sep)) continue; // 防目录穿越
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, await entry.async("nodebuffer"));
    count++;
  }
  return NextResponse.json({ ok: true, count });
}
