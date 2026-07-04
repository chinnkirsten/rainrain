import { NextResponse } from "next/server";
import { crossrefToReading } from "@/lib/reference";

export const runtime = "nodejs";

// ponytail: 只做「查一下」，不落库——落库已经是 /api/readings/import 在做的事，
// 这里复用同一个 crossrefToReading 字段映射，避免第二套 CrossRef→Reading 的翻译表。
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("doi") ?? "").trim();
  const doi = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
  if (!doi) return NextResponse.json({ error: "Missing doi." }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": "RainRain/0.1 (mailto:Kirstenchin1@outlook.com)" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? "未找到该 DOI" : `CrossRef ${res.status}` },
        { status: res.status === 404 ? 404 : 502 },
      );
    }
    const data = (await res.json()) as { message?: Record<string, unknown> };
    if (!data.message) return NextResponse.json({ error: "CrossRef 无数据" }, { status: 502 });
    return NextResponse.json({ reading: crossrefToReading(data.message) });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "CrossRef 请求超时" : "无法连接 CrossRef" },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
