"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { KnockLogo } from "@/components/KnockLogo";
import { cx } from "@/components/ui";

export type SubjectRef = { code: string; name: string };

/**
 * 공통 레이아웃.
 * 대시보드는 과목 하위 화면이므로, 과목 안에 들어와 있을 때만 [문제풀이 | 대시보드] 탭이 보입니다.
 * 이 화면에서는 다른 과목이 노출되지 않습니다.
 */
export function AppShell({
  subject,
  children,
  wide = false,
}: {
  subject?: SubjectRef;
  children: ReactNode;
  wide?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      {/* 한 줄짜리 헤더 — 탭을 아래 줄로 내리면 본문이 그만큼 밀려납니다.
          높이를 고정해 두어야 아래 문제 영역이 sticky 로 붙을 자리를 알 수 있습니다. */}
      <header className="sticky top-0 z-20 h-[var(--header-h)] border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-full max-w-app items-center gap-2 px-3 sm:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-1.5 text-brand" aria-label="과목 선택으로">
            <KnockLogo size={22} />
            <span className="hidden text-[0.9rem] font-bold tracking-tight text-ink sm:inline">
              오답노크
            </span>
          </Link>

          {subject && (
            <span className="min-w-0 max-w-[7rem] truncate text-[0.8rem] font-semibold sm:max-w-none">
              {subject.name}
            </span>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {subject && (
              <nav className="flex gap-0.5 rounded-lg bg-surface2 p-0.5">
                <TabLink
                  href={`/study?subject=${encodeURIComponent(subject.code)}`}
                  active={pathname === "/study"}
                >
                  문제풀이
                </TabLink>
                <TabLink
                  href={`/dashboard?subject=${encodeURIComponent(subject.code)}`}
                  active={pathname === "/dashboard"}
                >
                  대시보드
                </TabLink>
              </nav>
            )}
            <Link
              href="/settings"
              className="rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface2"
              aria-label="설정"
            >
              설정
            </Link>
          </div>
        </div>
      </header>

      <main
        className={cx(
          "mx-auto px-3 pb-10 pt-3 safe-bottom sm:px-4",
          wide ? "max-w-app" : "max-w-app sm:px-6",
        )}
      >
        {children}
      </main>
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "rounded-md px-2.5 py-1.5 text-center text-xs font-semibold transition",
        active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
