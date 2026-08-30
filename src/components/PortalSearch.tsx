"use client";

import { btn, cx } from "@/components/ui";

/**
 * 문제 내용을 포털에서 바로 검색.
 *
 * 새 탭으로 엽니다 — 같은 탭에서 나가면 아직 안 보낸 답안 큐가 배치 전송을 타야 해서
 * 굳이 위험을 만들 이유가 없고, 검색하고 돌아오면 풀던 문제가 그대로 있습니다.
 */

/** 너무 긴 지문을 통째로 넣으면 검색 결과가 오히려 나빠져서 앞부분만 씁니다. */
const MAX_QUERY = 120;

export function buildQuery(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > MAX_QUERY ? flat.slice(0, MAX_QUERY) : flat;
}

const PORTALS = [
  {
    name: "네이버 검색",
    url: (q: string) => `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}`,
  },
  {
    // dict.naver.com/dict.search 는 한글·영어 모두 통합사전 결과로 바로 열립니다.
    name: "네이버 사전",
    url: (q: string) => `https://dict.naver.com/dict.search?query=${encodeURIComponent(q)}`,
  },
  {
    name: "구글 검색",
    url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
] as const;

export function PortalSearch({ text }: { text: string }) {
  const query = buildQuery(text);
  if (!query) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">이 문제를 검색해 보기</p>
      <p className="mt-1 truncate text-[0.8rem] text-ink" title={query}>
        {query}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PORTALS.map((p) => (
          <a
            key={p.name}
            href={p.url(query)}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(btn.ghost, "w-full")}
          >
            {p.name}
            <span aria-hidden="true" className="text-muted">
              ↗
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
