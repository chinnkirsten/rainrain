import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";
import { coversDir, getItemById } from "@/lib/catalog";

export const runtime = "nodejs";

// 受登录保护的封面图代理：本地封面从 storage/covers 读取，种子封面重定向到静态路径。
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item?.cover) {
    return NextResponse.json({ error: "No cover." }, { status: 404 });
  }

  if (!item.cover.startsWith("local:")) {
    return NextResponse.redirect(new URL(item.cover, req.url));
  }

  const filePath = path.join(coversDir(), `${id}.jpg`);
  try {
    const info = await stat(filePath);
    const web = Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream;
    return new NextResponse(web, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Cover not found." }, { status: 404 });
  }
}
