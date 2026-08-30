"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KnockLogo } from "@/components/KnockLogo";
import { PinInput } from "@/components/PinInput";
import { btn, cx, ErrorBox } from "@/components/ui";
import { clearMeCache, loadMe } from "@/hooks/useAuth";

type Mode = "login" | "signup";

/**
 * 로그인 / 신규가입 분리 (기획안 2-4).
 * 자동 가입 방식으로는 "기존 사용자의 로그인"과 "이름+PIN 충돌"을 구분할 수 없어
 * 중복 안내를 할 수 없기 때문에 화면을 나눕니다.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadMe().then((me) => {
      if (me) router.replace("/");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "잠시 후 다시 시도해 주세요.");
      clearMeCache();
      await loadMe(true);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <span className="inline-flex text-brand">
          <KnockLogo size={52} />
        </span>
        <h1 className="mt-3 text-2xl font-bold">오답노크</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <b className="text-ink">두드리면 열릴지어다.</b>
          <br />
          오답 두드리기, 오답노크.
        </p>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl bg-surface2 p-1">
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cx(
              "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              mode === m ? "bg-surface text-ink shadow-sm" : "text-muted",
            )}
          >
            {m === "login" ? "로그인" : "처음이에요"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoComplete="username"
            placeholder="이름을 입력하세요"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand"
            required
          />
        </label>

        <div>
          <label htmlFor="pin" className="mb-1.5 block text-sm font-medium">
            번호 4자리
          </label>
          <PinInput
            id="pin"
            value={pin}
            onChange={setPin}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        {error && <ErrorBox message={error} />}

        <button type="submit" className={cx(btn.primary, "w-full")} disabled={busy}>
          {busy ? "확인 중…" : mode === "login" ? "로그인" : "가입하고 시작하기"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs leading-relaxed text-muted">
        {mode === "login"
          ? "처음이라면 위에서 [처음이에요]를 눌러 가입해 주세요."
          : "이름과 번호 조합이 이미 있으면 다른 번호를 입력해야 해요."}
        <br />
        번호 찾기 기능은 없으니 잊지 않을 숫자로 정해 주세요.
      </p>
    </div>
  );
}
