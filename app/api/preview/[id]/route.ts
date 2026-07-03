import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import mammoth from "mammoth";
import { getItemById, uploadsDir } from "@/lib/catalog";

export const runtime = "nodejs";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 把可读文档转成 HTML，供查看器内嵌预览（docx→mammoth，txt/md→纯文本）。
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // 解析源文件路径（本地上传 / 种子）
  let file: string | null = null;
  if (item.src.startsWith("local:")) file = path.join(uploadsDir(), item.src.slice(6));
  else if (item.src.startsWith("/seed")) file = path.join(process.cwd(), "public", item.src);
  if (!file) return NextResponse.json({ error: "No previewable source." }, { status: 415 });

  const ext = (item.filename.split(".").pop() || "").toLowerCase();
  try {
    if (ext === "docx") {
      const { value } = await mammoth.convertToHtml({ path: file });
      return new NextResponse(value || "<p></p>", {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, max-age=600" },
      });
    }
    if (["txt", "md", "csv", "tsv"].includes(ext)) {
      const raw = await fs.readFile(file, "utf8");
      return new NextResponse(`<pre style="white-space:pre-wrap">${escapeHtml(raw)}</pre>`, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return NextResponse.json({ error: "Type not previewable." }, { status: 415 });
  } catch {
    return NextResponse.json({ error: "Preview failed." }, { status: 500 });
  }
}
