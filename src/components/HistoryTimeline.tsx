"use client";

import { KIND_META } from "@/lib/domain/phrases";
import { isAnswerKind } from "@/lib/domain/types";
import { cx } from "@/components/ui";

/**
 * 응답 경과 타임라인 (기획안 2-5).
 * 왼쪽이 과거, 오른쪽이 최근. 색만으로 구분하지 않도록 문자도 함께 씁니다.
 */
export function HistoryTimeline({
  history,
  size = "sm",
}: {
  history: string;
  size?: "sm" | "md";
}) {
  if (!history) return <span className="text-xs text-muted">기록 없음</span>;

  const box = size === "md" ? "h-6 w-6 text-[0.72rem]" : "h-5 w-5 text-[0.62rem]";

  return (
    <span className="inline-flex flex-wrap gap-1" aria-label={`최근 응답 ${history.length}회`}>
      {[...history].map((ch, i) => {
        if (!isAnswerKind(ch)) return null;
        const meta = KIND_META[ch];
        return (
          <span
            key={`${i}-${ch}`}
            title={meta.label}
            className={cx(
              "inline-flex items-center justify-center rounded border border-current/30 font-bold",
              box,
              meta.tone,
            )}
          >
            {meta.icon}
          </span>
        );
      })}
    </span>
  );
}

export function HistoryLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] text-muted">
      {(Object.keys(KIND_META) as (keyof typeof KIND_META)[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1">
          <span className={cx("font-bold", KIND_META[k].tone)}>{KIND_META[k].icon}</span>
          {KIND_META[k].label}
        </span>
      ))}
    </div>
  );
}
