"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btn, cx, Empty } from "@/components/ui";
import { medal, pickRandomMetric, rankedRows, rankingTab } from "@/lib/domain/ranking-metrics";
import type { Comment, RankingRow } from "@/lib/domain/view-types";

/**
 * 과목(문제풀이 화면) 진입 인트로 — 랭킹 지표 하나를 랜덤으로 골라 1~3위를,
 * 최근 한줄남기기 3개를 함께 보여줍니다 (기획 요청 5).
 */
export function StudyIntroModal({
  subjectCode,
  ranking,
  comments,
  onClose,
}: {
  subjectCode: string;
  ranking: RankingRow[];
  comments: Comment[];
  onClose: () => void;
}) {
  const [metric] = useState(pickRandomMetric);
  const tab = rankingTab(metric);
  const top3 = rankedRows(ranking, metric, 3);
  const recentComments = comments.slice(0, 3);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="과목 랭킹 및 한줄 남기기"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full animate-sheet-up overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 safe-bottom sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 text-xs font-bold text-brand">이 과목 랭킹 · {tab.label}</p>
        {tab.note && <p className="mb-2 text-[0.7rem] text-muted">{tab.note}</p>}

        {top3.length === 0 ? (
          <Empty>아직 이 지표로 집계할 기록이 없어요.</Empty>
        ) : (
          <ul className="mb-5 space-y-1.5">
            {top3.map((r, i) => (
              <li
                key={r.userId}
                className={cx(
                  "flex items-center gap-3 rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm",
                  r.isMe && "border-brand/40 bg-brand/8 font-semibold",
                )}
              >
                <span className="w-7 shrink-0 text-center tabular-nums text-muted">
                  {medal(i) ?? i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {r.name}
                  {r.isMe && <span className="ml-1 text-[0.7rem] text-brand">나</span>}
                </span>
                <span className="shrink-0 tabular-nums">{tab.format(r)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mb-1.5 text-xs font-bold text-muted">최근 한마디</p>
        {recentComments.length === 0 ? (
          <Empty>아직 남겨진 글이 없어요.</Empty>
        ) : (
          <ul className="mb-5 space-y-2">
            {recentComments.map((c, i) => (
              <li key={`${c.createdAt}-${i}`} className="rounded-xl border border-line bg-surface2 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="shrink-0 text-[0.68rem] text-muted">
                    {c.createdAt.slice(0, 10)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Link
            href={`/dashboard?subject=${encodeURIComponent(subjectCode)}`}
            className={cx(btn.ghost, "flex-1")}
          >
            대시보드에서 더 보기
          </Link>
          <button type="button" className={btn.primary} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
