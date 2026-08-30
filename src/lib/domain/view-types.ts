/**
 * 서버가 내려주고 클라이언트가 그리는 화면용 타입.
 * 서버 전용 모듈(server-only)을 클라이언트 번들로 끌어오지 않기 위해 여기에 모읍니다.
 */

import type { LevelCounts } from "./progress";

export type Comment = { createdAt: string; name: string; body: string };

export type Totals = {
  solved: number;
  correct: number;
  wrong: number;
  seconds: number;
  accuracy: number;
};

/**
 * 랭킹 한 사람 — 지표를 하나만 주면 "많이 푼 사람"만 1등이 되어서,
 * 여러 지표를 한 번에 내려보내고 화면에서 골라 보게 합니다.
 * 순위는 화면에서 매깁니다 (지표마다 순위가 다르니까요).
 */
export type RankingRow = {
  userId: string;
  name: string;
  isMe: boolean;
  /** 누적 푼 문제 수 */
  solved: number;
  /** 누적 학습 시간(초) */
  seconds: number;
  /** 정답률 (%) */
  accuracy: number;
  /** 공부한 날 수 */
  days: number;
  /** 오늘/어제까지 이어진 연속 출석일 */
  streak: number;
  /** 마지막 스냅샷 기준 마스터한 문제 수 */
  mastered: number;
  /** 하루 최다 풀이 */
  best: number;
};

export type RankingMetric =
  | "solved"
  | "seconds"
  | "accuracy"
  | "days"
  | "streak"
  | "mastered"
  | "best";

/** 정답률 랭킹은 표본이 적으면 의미가 없어서 최소 풀이 수를 둡니다. */
export const ACCURACY_MIN_SOLVED = 20;

/** 날짜별 추이 한 점. levels 는 그날 마지막 동기화 시점의 난이도 스냅샷입니다. */
export type DailyPoint = {
  date: string;
  solved: number;
  correct: number;
  wrong: number;
  seconds: number;
  accuracy: number;
  levels: LevelCounts | null;
};

/** 최근 N일과 그 직전 N일을 견줘 "나아지고 있는지"를 한 줄로 말해 주는 값 */
export type TrendDelta = { recent: number; prev: number; delta: number; hasPrev: boolean };

export type Trend = {
  days: number;
  /** 정답률 (%) */
  accuracy: TrendDelta;
  /** 하루 평균 학습시간 (분) */
  minutesPerDay: TrendDelta;
  /** 하루 평균 푼 문제 수 */
  solvedPerDay: TrendDelta;
};

/** 대시보드는 과목 하위 화면이라 모든 수치가 그 과목으로 한정됩니다. */
export type DashboardData = {
  date: string;
  subjectCode: string;
  today: Totals;
  total: Totals;
  attendance: string[];
  daily: DailyPoint[];
  trend: Trend;
  ranking: RankingRow[];
  visitors: { today: number; totalLearners: number };
  comments: Comment[];
};

/**
 * 난이도 요약 — 문제 1,000개를 다 내려보내지 않고 이 값만 내려줍니다.
 * unseen 은 아직 한 번도 안 나온 문제 수입니다.
 */
export type LevelSummary = {
  counts: LevelCounts;
  unseen: number;
  attempted: number;
  total: number;
};

/**
 * 심화 학습 묶음.
 * "자주 노크 중" 하나만 두면 늘 같은 문제만 보게 되어서, 목적이 다른 묶음을 나눠 둡니다.
 * 각 묶음은 통째로 몰아서 풀 수 있습니다.
 */
export type FocusBucketKey = "knocking" | "weak" | "recent" | "almost" | "unseen";

export type FocusBucket = {
  key: FocusBucketKey;
  label: string;
  /** 이 묶음이 무엇인지 한 줄 설명 */
  hint: string;
  rows: ReviewRow[];
  /** 조건에 맞는 전체 개수 (rows 는 그중 일부) */
  total: number;
};

/** 대시보드 "학습 인사이트" 응답 */
export type InsightData = {
  subject: { code: string; name: string };
  levels: LevelSummary;
  buckets: FocusBucket[];
};

/** 문제 상세 모달이 쓰는 한 문제의 학습 이력 */
export type ReviewRow = {
  id: string;
  text: string;
  answer: string;
  options: string[];
  explanation: string;
  score: number;
  streak: number;
  correct: number;
  wrong: number;
  history: string;
  total: number;
  accuracy: number;
  weight: number;
};
