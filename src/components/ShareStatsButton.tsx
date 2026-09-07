"use client";

import { useState } from "react";
import { btn, cx } from "@/components/ui";
import { pickShareLabel } from "@/lib/domain/phrases";
import { drawStatsCard, shareStatsImage, type StatsCardInput } from "@/lib/util/shareImage";

/**
 * 진도율/마스터율을 이미지로 만들어 공유합니다 (기획 요청 4).
 * 문제풀이 화면 상단과 마일스톤 축하 팝업 양쪽에서 재사용합니다.
 */
export function ShareStatsButton({
  stats,
  variant = "ghost",
  label,
  fullWidth = false,
}: {
  stats: StatsCardInput;
  /** primary = 브랜드색으로 눈에 띄게 (축하 팝업 등 핵심 동작으로 둘 때) */
  variant?: "primary" | "ghost" | "subtle";
  /** 생략하면 문구 풀에서 하나를 뽑아 씁니다 (기획 요청 — "이 순간 공유하기"처럼 특정 순간을 지칭하지 않고 담백하게) */
  label?: string;
  fullWidth?: boolean;
}) {
  const [fallbackLabel] = useState(pickShareLabel);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const blob = await drawStatsCard(stats);
      const result = await shareStatsImage(blob, stats.subjectName);
      setNotice(result === "shared" ? "공유했어요." : "이미지를 저장했어요.");
    } catch (err) {
      // 사용자가 공유 시트를 취소한 경우(AbortError)는 실패로 안내하지 않습니다.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setNotice("이미지를 만들지 못했어요.");
    } finally {
      setBusy(false);
      setTimeout(() => setNotice(null), 2600);
    }
  };

  const variantClass = variant === "primary" ? btn.primary : variant === "ghost" ? btn.ghost : btn.subtle;

  return (
    <span className={cx("inline-flex items-center gap-2", fullWidth && "flex w-full flex-col items-stretch")}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={cx(variantClass, !fullWidth && "!min-h-[38px] !px-3 text-xs", fullWidth && "w-full")}
      >
        <ShareIcon />
        {busy ? "만드는 중…" : (label ?? fallbackLabel)}
      </button>
      {notice && <span className="text-[0.7rem] text-muted">{notice}</span>}
    </span>
  );
}

/** feather "share-2" 아이콘 — 공유 버튼이 다른 버튼들 사이에서 한눈에 띄도록 */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
