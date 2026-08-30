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

export type RankingRow = {
  rank: number;
  userId: string;
  name: string;
  solved: number;
  accuracy: number;
  isMe: boolean;
};

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
  myRank: number | null;
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

/** 대시보드 "학습 인사이트" 응답 */
export type InsightData = {
  subject: { code: string; name: string };
  levels: LevelSummary;
  /** score 가 높아 지금 가장 자주 노크당하는 문제 몇 개만 */
  focus: ReviewRow[];
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
