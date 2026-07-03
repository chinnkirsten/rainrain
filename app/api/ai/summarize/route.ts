import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ollamaStatus, ollamaSummarize } from "@/lib/ai";
import { blobConfigured } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (blobConfigured()) {
    return NextResponse.json(
      { error: "AI summaries run via local Ollama — available in the local edition only." },
      { status: 400 },
    );
  }
  let b: { itemId?: string; model?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const itemId = String(b.itemId ?? "");
  if (!itemId) return NextResponse.json({ error: "Missing itemId." }, { status: 400 });

  const status = await ollamaStatus();
  if (!status.available) return NextResponse.json({ error: "OLLAMA_UNAVAILABLE" }, { status: 503 });
  const model = b.model && status.models.includes(b.model) ? b.model : status.models[0];
  if (!model) return NextResponse.json({ error: "NO_MODEL" }, { status: 400 });

  let text = "";
  try {
    text = await fs.readFile(path.join(process.cwd(), "storage", "text", `${itemId}.txt`), "utf8");
  } catch {}
  if (text.trim().length < 40) return NextResponse.json({ error: "NO_TEXT" }, { status: 400 });

  try {
    const summary = await ollamaSummarize(text, model);
    return NextResponse.json({ summary, model });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
