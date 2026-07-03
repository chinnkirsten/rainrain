import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";
import { getItemById, uploadsDir } from "@/lib/catalog";

export const runtime = "nodejs";

// 受登录保护的文件代理：本地从磁盘读取、云端从 Blob 取回；都不暴露底层地址。
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const disposition = `inline; filename*=UTF-8''${encodeURIComponent(item.filename)}`;

  // 种子文件：静态资源，重定向（同样受中间件保护）。
  if (item.seed || item.src.startsWith("/seed")) {
    return NextResponse.redirect(new URL(item.src, req.url));
  }

  // 本地磁盘文件（支持 Range，便于录音/视频拖动播放）
  if (item.src.startsWith("local:")) {
    const diskName = item.src.slice("local:".length);
    const filePath = path.join(uploadsDir(), diskName);
    try {
      const info = await stat(filePath);
      const total = info.size;
      const ctype = item.mime || "application/octet-stream";
      const range = req.headers.get("range");
      const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) {
        const start = m[1] ? parseInt(m[1], 10) : 0;
        const end = m[2] ? parseInt(m[2], 10) : total - 1;
        if (start >= total || end >= total || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${total}` },
          });
        }
        const stream = createReadStream(filePath, { start, end });
        const web = Readable.toWeb(stream) as unknown as ReadableStream;
        return new NextResponse(web, {
          status: 206,
          headers: {
            "Content-Type": ctype,
            "Content-Length": String(end - start + 1),
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Content-Disposition": disposition,
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
      const nodeStream = createReadStream(filePath);
      const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
      return new NextResponse(webStream, {
        status: 200,
        headers: {
          "Content-Type": ctype,
          "Content-Length": String(total),
          "Accept-Ranges": "bytes",
          "Content-Disposition": disposition,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      return NextResponse.json({ error: "Could not read file." }, { status: 404 });
    }
  }

  // 云端 Blob
  const upstream = await fetch(item.src, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Could not read file." }, { status: 502 });
  }
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? item.mime ?? "application/octet-stream");
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  headers.set("Content-Disposition", disposition);
  headers.set("Cache-Control", "private, max-age=3600");
  return new NextResponse(upstream.body, { status: 200, headers });
}
