// 跨平台 PDF 首页封面渲染（pdf-to-img + sharp）。不依赖 macOS 工具，Windows/Mac/Linux 通用。
import { pdf } from "pdf-to-img";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

/** 渲染 srcPdf 首页 → outJpg（宽约 900px，JPEG）。成功返回 true。 */
export async function renderCover(srcPdf, outJpg) {
  try {
    const doc = await pdf(srcPdf, { scale: 2 });
    let firstPng = null;
    for await (const page of doc) { firstPng = page; break; }
    if (!firstPng) return false;
    await fs.mkdir(path.dirname(outJpg), { recursive: true });
    await sharp(firstPng)
      .resize({ width: 900, withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toFile(outJpg);
    return true;
  } catch {
    return false;
  }
}
