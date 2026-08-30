"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { KnockLogo } from "@/components/KnockLogo";
import { btn, Empty, ErrorBox, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";

type SubjectCard = {
  code: string;
  name: string;
  group: string;
  description: string;
  total: number;
  seen: number;
  knocking: number;
};

export default function HomePage() {
  const router = useRouter();
  const { me, loading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<SubjectCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !me) router.replace("/login");
  }, [authLoading, me, router]);

  const load = () => {
    setError(null);
    setSubjects(null);
    fetch("/api/subjects", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "과목을 불러오지 못했습니다.");
        return data.subjects as SubjectCard[];
      })
      .then(setSubjects)
      .catch((e: Error) => setError(e.message));
  };

  useEffect(() => {
    if (me) load();
  }, [me]);

  if (authLoading || !me) return null;

  // 상위그룹으로 묶어서 보여줍니다 (기획안 3-4 ⑤)
  const groups = new Map<string, SubjectCard[]>();
  for (const s of subjects ?? []) {
    const key = s.group || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-start gap-3">
        <span className="mt-0.5 text-brand">
          <KnockLogo size={34} />
        </span>
        <div>
          <h1 className="text-lg font-bold">
            {me.name}님, 오늘도 <span className="text-brand">똑똑</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            공부할 과목을 고르세요. 두드리면 열릴지어다.
          </p>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!error && !subjects && <Spinner label="과목을 불러오는 중" />}

      {subjects && subjects.length === 0 && (
        <Empty>
          아직 등록된 과목이 없습니다.
          <br />
          구글시트의 <b>과목목록</b> 시트에 과목을 추가해 주세요.
        </Empty>
      )}

      <div className="space-y-6">
        {[...groups.entries()].map(([group, items]) => (
          <section key={group || "_"} className="space-y-2">
            {group && (
              <h2 className="px-1 text-sm font-bold text-muted">{group}</h2>
            )}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <li key={s.code}>
                  <Link
                    href={`/study?subject=${encodeURIComponent(s.code)}`}
                    className="block h-full rounded-2xl border border-line bg-surface p-4 transition hover:border-brand/60 hover:bg-surface2 active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold">{s.name}</h3>
                      {s.knocking > 0 && (
                        <span className="shrink-0 rounded-full bg-brand/12 px-2 py-0.5 text-[0.68rem] font-semibold text-brand">
                          자주 노크 {s.knocking}
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{s.description}</p>
                    )}

                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                        <div
                          className="h-full rounded-full bg-brand transition-[width]"
                          style={{
                            width: `${s.total > 0 ? Math.round((s.seen / s.total) * 100) : 0}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1.5 text-[0.72rem] text-muted tabular-nums">
                        {s.seen} / {s.total}문제 만나봤어요
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </AppShell>
  );
}

function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={btn.ghost}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        const { clearMeCache } = await import("@/hooks/useAuth");
        clearMeCache();
        router.replace("/login");
      }}
    >
      로그아웃
    </button>
  );
}
