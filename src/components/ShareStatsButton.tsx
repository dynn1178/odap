"use client";

import { useState } from "react";
import { btn, cx } from "@/components/ui";
import { drawStatsCard, shareStatsImage, type StatsCardInput } from "@/lib/util/shareImage";

/**
 * 진도율/마스터율을 이미지로 만들어 공유합니다 (기획 요청 4).
 * 문제풀이 화면 상단과 마일스톤 축하 팝업 양쪽에서 재사용합니다.
 */
export function ShareStatsButton({
  stats,
  variant = "ghost",
  label = "공유하기",
}: {
  stats: StatsCardInput;
  variant?: "ghost" | "subtle";
  label?: string;
}) {
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

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={cx(variant === "ghost" ? btn.ghost : btn.subtle, "!min-h-[38px] !px-3 text-xs")}
      >
        {busy ? "만드는 중…" : label}
      </button>
      {notice && <span className="text-[0.7rem] text-muted">{notice}</span>}
    </span>
  );
}
