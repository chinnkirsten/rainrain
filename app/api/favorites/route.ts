import { NextResponse } from "next/server";
import { getFavorites, setFavorite } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ favorites: await getFavorites() });
}

export async function POST(req: Request) {
  let body: { id?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const favorites = await setFavorite(id, !!body.value);
  return NextResponse.json({ favorites });
}
