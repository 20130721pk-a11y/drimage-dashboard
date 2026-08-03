// 대시보드 접근 보호용 공용 헬퍼
// middleware.ts (Edge runtime)와 app/api/login/route.ts (Node runtime) 양쪽에서
// 사용하므로 Web Crypto API(crypto.subtle)만 사용해 두 런타임 모두 호환되도록 작성.

export const AUTH_COOKIE_NAME = "dashboard_auth";

/**
 * 문자열을 SHA-256으로 해시하여 hex 문자열로 반환.
 * 쿠키에는 원문 비밀번호 대신 이 해시값만 저장한다.
 */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 환경변수에 설정된 실제 비밀번호로부터 기대되는 쿠키 값(해시)을 계산.
 * DASHBOARD_PASSWORD가 설정되지 않은 경우 null을 반환 (보호 비활성화 신호).
 */
export async function getExpectedAuthCookieValue(): Promise<string | null> {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return null;
  return sha256Hex(password);
}
