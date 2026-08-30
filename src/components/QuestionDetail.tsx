"use client";

import { useEffect } from "react";
import Link from "next/link";
import { HistoryLegend, HistoryTimeline } from "@/components/HistoryTimeline";
import { btn, cx } from "@/components/ui";
import { displayAnswer } from "@/lib/domain/grade";
import type { ReviewRow } from "@/lib/domain/view-types";

/**
 * 문제 상세 — 모바일은 바텀시트, PC는 중앙 모달 (기획안 2-5).
 */
export function QuestionDetail({
  row,
  subjectCode,
  onClose,
}: {
  row: ReviewRow;
  subjectCode: string;
  onClose: () => void;
}) {
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
      aria-label="문제 상세"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full animate-sheet-up overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 safe-bottom sm:max-w-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.7rem] text-muted">문제 {row.id}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-[1.05rem] font-semibold leading-relaxed">
              {row.text}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 shrink-0 rounded-lg text-muted hover:bg-surface2"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {row.reverseText && (
          <p className="mb-3 rounded-lg bg-surface2 px-3 py-2 text-xs text-muted">
            뒤집으면 <b className="text-ink">{row.reverseText}</b> → {row.text}
          </p>
        )}

        {row.open ? (
          <div className="rounded-xl border border-correct bg-correct/10 px-3.5 py-2.5 text-sm font-semibold text-correct">
            <span className="mr-2 text-xs font-normal opacity-70">주관식 정답</span>
            {displayAnswer(row.answer)}
          </div>
        ) : (
        <ul className="space-y-2">
          {row.options.map((o) => {
            const isAnswer = o === row.answer;
            return (
              <li
                key={o}
                className={cx(
                  "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed",
                  isAnswer
                    ? "border-correct bg-correct/10 font-semibold text-correct"
                    : "border-line text-muted",
                )}
              >
                <span aria-hidden="true" className="w-4 shrink-0 text-center font-bold">
                  {isAnswer ? "○" : ""}
                </span>
                <span className="whitespace-pre-wrap break-words">{o}</span>
              </li>
            );
          })}
        </ul>
        )}

        {row.explanation && (
          <div className="mt-4 rounded-xl bg-surface2 p-3.5 text-sm leading-relaxed">
            <p className="mb-1 text-xs font-bold text-muted">해설</p>
            <p className="whitespace-pre-wrap break-words">{row.explanation}</p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          <Mini label="총 풀이" value={row.total} />
          <Mini label="맞음" value={row.correct} tone="text-correct" />
          <Mini label="틀림" value={row.wrong} tone="text-wrong" />
          <Mini label="정답률" value={`${row.accuracy}%`} />
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-bold text-muted">
            응답 경과 · 현재 점수 {row.score} (노출 {row.weight}배)
          </p>
          <HistoryTimeline history={row.history} size="md" />
          <div className="mt-2">
            <HistoryLegend />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Link
            href={`/study?subject=${encodeURIComponent(subjectCode)}&drill=${encodeURIComponent(row.id)}&label=${encodeURIComponent("이 문제만")}`}
            className={cx(btn.primary, "flex-1")}
          >
            이 문제 다시 풀기
          </Link>
          <button type="button" className={btn.ghost} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl bg-surface2 px-2 py-2.5">
      <div className="text-[0.68rem] text-muted">{label}</div>
      <div className={cx("mt-0.5 text-sm font-bold tabular-nums", tone)}>{value}</div>
    </div>
  );
}
