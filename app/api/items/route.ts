import { NextResponse } from "next/server";
import { addItem, blobConfigured, getAllItems, toPublicItem } from "@/lib/catalog";
import { detectKind, titleFromFilename, yearFromFilename, type ResearchItem } from "@/lib/types";
import { isPhaseId } from "@/lib/phases";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase");
  let items = await getAllItems();
  if (phase && isPhaseId(phase)) {
    items = items.filter((i) => i.phase === phase);
  }
  return NextResponse.json({
    items: items.map(toPublicItem),
    blobConfigured: blobConfigured(),
  });
}

export async function POST(req: Request) {
  if (!blobConfigured()) {
    return NextResponse.json(
      { error: "Cloud storage (Vercel Blob) is not configured." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const url = String(body.url ?? "");
  const filename = String(body.filename ?? body.pathname ?? "file");
  const phase = String(body.phase ?? "");
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Missing a valid file URL." }, { status: 400 });
  }
  if (!isPhaseId(phase)) {
    return NextResponse.json({ error: "Invalid research phase." }, { status: 400 });
  }

  const contentType = body.contentType ? String(body.contentType) : undefined;
  const cleanName = filename.split("/").pop() ?? filename;
  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
    : typeof body.tags === "string"
      ? body.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  const item: ResearchItem = {
    id: crypto.randomUUID(),
    phase,
    title: body.title ? String(body.title) : titleFromFilename(cleanName),
    description: body.description ? String(body.description) : undefined,
    year: body.year ? String(body.year) : yearFromFilename(cleanName),
    kind: detectKind(cleanName, contentType),
    src: url,
    filename: cleanName,
    size: typeof body.size === "number" ? body.size : undefined,
    createdAt: new Date().toISOString(),
    tags,
  };

  await addItem(item);
  return NextResponse.json({ item: toPublicItem(item) });
}
