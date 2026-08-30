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
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-app items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-brand" aria-label="과목 선택으로">
            <KnockLogo size={24} />
            <span className="text-[0.95rem] font-bold tracking-tight text-ink">오답노크</span>
          </Link>

          {subject && (
            <>
              <span className="text-muted" aria-hidden="true">
                /
              </span>
              <span className="truncate text-sm font-semibold">{subject.name}</span>
            </>
          )}

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/settings"
              className="rounded-lg px-2 py-2 text-sm text-muted hover:bg-surface2"
              aria-label="설정"
            >
              설정
            </Link>
          </div>
        </div>

        {subject && (
          <nav className="mx-auto max-w-app px-4 pb-2">
            <div className="flex gap-1 rounded-xl bg-surface2 p-1">
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
            </div>
          </nav>
        )}
      </header>

      <main
        className={cx(
          "mx-auto px-4 pb-24 pt-4 safe-bottom",
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
        "flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition",
        active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
