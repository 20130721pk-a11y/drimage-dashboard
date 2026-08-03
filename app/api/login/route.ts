import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, sha256Hex } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let password: unknown;
  try {
    const body = await req.json();
    password = body?.password;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json(
      { error: "서버에 DASHBOARD_PASSWORD 환경변수가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  if (typeof password !== "string" || password !== correctPassword) {
    // 무차별 대입 시도를 약간이라도 늦추기 위한 지연
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const hashed = await sha256Hex(correctPassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, hashed, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30일 유지
  });
  return res;
}
