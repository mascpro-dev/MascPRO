import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const USER = /^[A-Za-z0-9._]{1,30}$/;
const cache = new Map<string, { ate: number; fotos: string[] }>();

function usuario(raw: string | null) {
  const h = String(raw || "")
    .trim()
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
  return USER.test(h) ? h : "";
}

async function fotosDoPerfil(user: string) {
  const salvo = cache.get(user);
  if (salvo && salvo.ate > Date.now()) return salvo.fotos;

  const res = await fetch(`https://www.instagram.com/${user}/`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Accept-Language": "pt-BR",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const html = await res.text();
  const flat = html.replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
  const urls = [...flat.matchAll(/https:\/\/scontent[^"\s]+?\.jpg\?[^"\s]+/g)].map((m) => m[0]);
  const vistos = new Set<string>();
  const fotos: string[] = [];
  for (const url of urls) {
    if (!url.includes("s640x640") && !url.includes("dst-jpg_e35")) continue;
    const id = url.match(/\/([^/?]+)\.jpg/)?.[1];
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    fotos.push(url);
    if (fotos.length >= 6) break;
  }
  cache.set(user, { ate: Date.now() + 15 * 60 * 1000, fotos });
  return fotos;
}

export async function GET(req: NextRequest) {
  const user = usuario(req.nextUrl.searchParams.get("u"));
  if (!user) return NextResponse.json({ fotos: [] });

  const fotos = await fotosDoPerfil(user);
  const n = req.nextUrl.searchParams.get("n");
  if (n == null) {
    return NextResponse.json({
      fotos: fotos.map((_, i) => `/api/mapa/instagram?u=${encodeURIComponent(user)}&n=${i}`),
    });
  }

  const url = fotos[Number(n)];
  if (!url) return new NextResponse(null, { status: 404 });
  const img = await fetch(url, { cache: "no-store" });
  if (!img.ok) return new NextResponse(null, { status: 404 });
  const bytes = await img.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": img.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
