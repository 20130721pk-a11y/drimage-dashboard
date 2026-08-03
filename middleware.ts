import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getExpectedAuthCookieValue } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const expected = await getExpectedAuthCookieValue();

  // DASHBOARD_PASSWORD가 설정되지 않은 환경(예: 로컬 개발)에서는
  // 실수로 전체 차단되지 않도록 보호를 비활성화.
  if (!expected) {
    return NextResponse.next();
  }

  const cookieValue = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (cookieValue === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set(
    "next",
    req.nextUrl.pathname + req.nextUrl.search
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // /login, /api/login, Next.js 정적 자산, favicon은 인증 없이 접근 가능해야 함
    "/((?!login|api/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
