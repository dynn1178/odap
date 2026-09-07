"use client";

import { useEffect, useState } from "react";
import { ShareStatsButton } from "@/components/ShareStatsButton";
import { btn, cx } from "@/components/ui";
import { pickNotePrompt } from "@/lib/domain/phrases";
import type { Milestone } from "@/lib/domain/progress";

export type Celebration = {
  type: "progress" | "mastery";
  milestone: Milestone;
  message: string;
};

/**
 * 진도율/마스터율 25% 단위 축하 팝업 (기획 요청 1·2·3).
 * QuestionDetail.tsx 와 같은 다이얼로그 셸(바텀시트/센터모달)을 재사용합니다.
 */
export function CelebrationModal({
  celebration,
  subjectCode,
  subjectName,
  progressPct,
  masteryPct,
  seen,
  total,
  mastered,
  onClose,
}: {
  celebration: Celebration;
  subjectCode: string;
  subjectName: string;
  progressPct: number;
  masteryPct: number;
  seen: number;
  total: number;
  mastered: number;
  onClose: () => void;
}) {
  const [prompt] = useState(pickNotePrompt);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectCode,
          body: note,
          progressPct: Math.round(progressPct),
          masteryPct: Math.round(masteryPct),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "등록에 실패했습니다.");
      setPosted(true);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const title = celebration.type === "progress" ? "진도율" : "마스터율";
  const pct = celebration.type === "progress" ? progressPct : masteryPct;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} ${celebration.milestone}% 달성`}
      onClick={onClose}
    >
      <div
        className="w-full animate-sheet-up rounded-t-2xl border border-line bg-surface p-5 safe-bottom sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2 text-brand">
          <span className="text-2xl" aria-hidden="true">
            🎉
          </span>
          <span className="text-xs font-bold">
            {title} {celebration.milestone}% 달성
          </span>
        </div>

        <p className="mb-4 text-lg font-bold leading-snug">{celebration.message}</p>

        <div className="mb-4 rounded-xl bg-surface2 px-3 py-2.5 text-xs text-muted">
          현재 {title} <b className="text-ink">{Math.round(pct)}%</b>
        </div>

        <form onSubmit={submitNote} className="space-y-2">
          <p className="text-xs text-muted">{prompt}</p>
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="한 줄로 남겨보세요 (200자)"
              className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <button type="submit" className={btn.primary} disabled={busy || !note.trim()}>
              {busy ? "…" : "남기기"}
            </button>
          </div>
          {error && <p className="text-xs text-wrong">{error}</p>}
          {posted && (
            <p className="text-xs text-correct">대시보드 한줄 남기기에 등록했어요.</p>
          )}
        </form>

        <div className="mt-5 flex flex-col gap-2">
          <ShareStatsButton
            stats={{ subjectName, progressPct, masteryPct, seen, total, mastered }}
            variant="primary"
            label="이 순간 공유하기"
            fullWidth
          />
          <button type="button" className={cx(btn.ghost, "w-full")} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
