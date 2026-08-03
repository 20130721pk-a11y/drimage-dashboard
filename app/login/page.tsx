"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }

      const next = searchParams.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-xl"
      >
        <h1 className="text-xl font-bold text-white tracking-tight mb-1">
          드림에이지 모니터링 대시보드
        </h1>
        <p className="text-xs text-gray-500 mb-6">
          접근하려면 비밀번호를 입력하세요.
        </p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-gray-500 transition-colors"
        />

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="w-full mt-4 bg-gray-100 text-gray-900 font-medium px-3 py-2 rounded-lg text-sm hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? "확인 중..." : "입장"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
