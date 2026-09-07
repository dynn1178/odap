import { formatDuration } from "@/lib/util/date";
import { ACCURACY_MIN_SOLVED, type RankingMetric, type RankingRow } from "./view-types";

/**
 * 랭킹 지표 7종의 라벨·값·표시 포맷을 한 곳에 모읍니다.
 * 대시보드 "랭킹" 섹션과 과목 진입 인트로 팝업이 같은 정의를 씁니다.
 */
export const RANKING_METRIC_TABS: {
  key: RankingMetric;
  label: string;
  format: (r: RankingRow) => string;
  value: (r: RankingRow) => number;
  note?: string;
}[] = [
  {
    key: "solved",
    label: "문제풀이",
    value: (r) => r.solved,
    format: (r) => `${r.solved.toLocaleString()}문제`,
  },
  {
    key: "seconds",
    label: "공부시간",
    value: (r) => r.seconds,
    format: (r) => formatDuration(r.seconds),
  },
  {
    key: "accuracy",
    label: "정답률",
    value: (r) => r.accuracy,
    format: (r) => `${r.accuracy}%`,
    note: `${ACCURACY_MIN_SOLVED}문제 이상 푼 사람만 집계합니다`,
  },
  {
    key: "mastered",
    label: "마스터",
    value: (r) => r.mastered,
    format: (r) => `${r.mastered}문제`,
    note: "score 0 까지 내려놓고 2번 이상 맞힌 문제 수",
  },
  { key: "days", label: "출석일수", value: (r) => r.days, format: (r) => `${r.days}일` },
  {
    key: "streak",
    label: "연속출석",
    value: (r) => r.streak,
    format: (r) => `${r.streak}일째`,
    note: "오늘 또는 어제까지 이어진 날 수",
  },
  {
    key: "best",
    label: "하루 최다",
    value: (r) => r.best,
    format: (r) => `${r.best}문제`,
    note: "하루에 가장 많이 푼 기록",
  },
];

export function rankingTab(metric: RankingMetric) {
  return RANKING_METRIC_TABS.find((t) => t.key === metric)!;
}

/**
 * 지표 기준으로 다시 줄 세웁니다. rows 는 서버에서 가입 순으로 와 있어서
 * (JS sort 는 안정 정렬) 동점자는 먼저 가입한 사람이 앞섭니다.
 */
export function rankedRows(rows: RankingRow[], metric: RankingMetric, limit = 50): RankingRow[] {
  const tab = rankingTab(metric);
  const pool = metric === "accuracy" ? rows.filter((r) => r.solved >= ACCURACY_MIN_SOLVED) : rows;
  return [...pool]
    .filter((r) => tab.value(r) > 0)
    .sort((a, b) => tab.value(b) - tab.value(a))
    .slice(0, limit);
}

/** 1~3위만 표시를 달리해, 색이 아니라 기호로도 구분되게 합니다. */
export function medal(index: number): string | null {
  return ["🥇", "🥈", "🥉"][index] ?? null;
}

export function pickRandomMetric(): RankingMetric {
  const i = Math.floor(Math.random() * RANKING_METRIC_TABS.length);
  return RANKING_METRIC_TABS[i].key;
}
