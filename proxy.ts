import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// 公开放行的路径前缀（登录页与登录接口本身）。
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySessionToken(token);
  if (ok) return NextResponse.next();

  // 未登录：API 返回 401，页面重定向到登录页。
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized — please sign in." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // 保护除 Next 内部资源与 favicon 之外的一切（含 /seed 静态研究文件）。
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
