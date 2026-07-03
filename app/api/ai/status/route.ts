import { NextResponse } from "next/server";
import { ollamaStatus } from "@/lib/ai";
import { blobConfigured } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  if (blobConfigured()) return NextResponse.json({ available: false, models: [], cloud: true });
  return NextResponse.json(await ollamaStatus());
}
