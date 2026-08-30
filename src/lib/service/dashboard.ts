import "server-only";
import { listComments } from "@/lib/repo/comments";
import type {
  DailyPoint,
  DashboardData,
  RankingRow,
  Totals,
  Trend,
  TrendDelta,
} from "@/lib/domain/view-types";
import { loadDailyTable, readDailyRows, type DailyRow } from "@/lib/repo/stats";
import { listUsersBrief } from "@/lib/repo/users";
import { kstDate } from "@/lib/util/date";

export type { DashboardData, RankingRow, Totals } from "@/lib/domain/view-types";

/** 추이 그래프에 그릴 최근 일수 — 이 과목을 공부한 날만 셉니다. */
const TREND_WINDOW_DAYS = 60;
/** "나아지고 있나?" 비교 구간 */
const COMPARE_DAYS = 7;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function shiftDate(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** 날짜별로 접어서 시계열 한 줄로 만듭니다 (같은 날 여러 행이 있어도 합칩니다). */
function toDailyPoints(rows: DailyRow[]): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>();
  for (const r of rows) {
    const p = byDate.get(r.date) ?? {
      date: r.date,
      solved: 0,
      correct: 0,
      wrong: 0,
      seconds: 0,
      accuracy: 0,
      levels: null,
    };
    p.solved += r.solved;
    p.correct += r.correct;
    p.wrong += r.wrong;
    p.seconds += r.seconds;
    if (r.levels) p.levels = r.levels;
    byDate.set(r.date, p);
  }

  return [...byDate.values()]
    .map((p) => ({ ...p, accuracy: p.solved > 0 ? round1((p.correct / p.solved) * 100) : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-TREND_WINDOW_DAYS);
}

function delta(recent: number, prev: number, hasPrev: boolean): TrendDelta {
  return { recent: round1(recent), prev: round1(prev), delta: round1(recent - prev), hasPrev };
}

/**
 * 최근 7일과 그 직전 7일을 견줍니다.
 * 하루 평균은 "공부한 날"이 아니라 7일 전체로 나눕니다 — 꾸준함까지 지표에 담기 위해서입니다.
 */
function buildTrend(points: DailyPoint[], today: string): Trend {
  const sum = (from: string, to: string) => {
    const inRange = points.filter((p) => p.date >= from && p.date <= to);
    const t = inRange.reduce(
      (a, p) => ({
        solved: a.solved + p.solved,
        correct: a.correct + p.correct,
        seconds: a.seconds + p.seconds,
      }),
      { solved: 0, correct: 0, seconds: 0 },
    );
    return {
      ...t,
      accuracy: t.solved > 0 ? (t.correct / t.solved) * 100 : 0,
      minutesPerDay: t.seconds / 60 / COMPARE_DAYS,
      solvedPerDay: t.solved / COMPARE_DAYS,
    };
  };

  const recent = sum(shiftDate(today, -(COMPARE_DAYS - 1)), today);
  const prev = sum(shiftDate(today, -(COMPARE_DAYS * 2 - 1)), shiftDate(today, -COMPARE_DAYS));
  const hasPrev = prev.solved > 0;

  return {
    days: COMPARE_DAYS,
    accuracy: delta(recent.accuracy, prev.accuracy, hasPrev),
    minutesPerDay: delta(recent.minutesPerDay, prev.minutesPerDay, hasPrev),
    solvedPerDay: delta(recent.solvedPerDay, prev.solvedPerDay, hasPrev),
  };
}

type UserAgg = {
  solved: number;
  correct: number;
  seconds: number;
  best: number;
  dates: Set<string>;
  mastered: number;
  lastLevelDate: string;
};

/** 랭킹에 내려보낼 최대 인원. 지표마다 상위권이 달라서 넉넉히 보냅니다. */
const RANKING_LIMIT = 200;

/**
 * 오늘(또는 어제)부터 거꾸로 이어진 연속 출석일.
 * 오늘 아직 안 풀었어도 어제까지 이어졌으면 끊긴 것으로 보지 않습니다.
 */
export function currentStreak(dates: Set<string>, today: string): number {
  let cursor = dates.has(today) ? today : shiftDate(today, -1);
  if (!dates.has(cursor)) return 0;
  let n = 0;
  while (dates.has(cursor)) {
    n += 1;
    cursor = shiftDate(cursor, -1);
  }
  return n;
}

function totals(rows: { solved: number; correct: number; wrong: number; seconds: number }[]): Totals {
  const t = rows.reduce(
    (acc, r) => ({
      solved: acc.solved + r.solved,
      correct: acc.correct + r.correct,
      wrong: acc.wrong + r.wrong,
      seconds: acc.seconds + r.seconds,
    }),
    { solved: 0, correct: 0, wrong: 0, seconds: 0 },
  );
  return { ...t, accuracy: t.solved > 0 ? Math.round((t.correct / t.solved) * 1000) / 10 : 0 };
}

/**
 * 대시보드는 과목 하위 화면입니다.
 * 모든 수치(오늘/누적/출석/랭킹/방문자/한줄남기기)를 이 과목 것만으로 한정합니다.
 */
export async function buildDashboard(
  userId: string,
  subjectCode: string,
): Promise<DashboardData> {
  const [dailyTable, users, comments] = await Promise.all([
    loadDailyTable(),
    listUsersBrief(),
    listComments(subjectCode),
  ]);

  const rows = readDailyRows(dailyTable).filter((r) => r.subjectCode === subjectCode);
  const today = kstDate();

  const mine = rows.filter((r) => r.userId === userId);
  const attendance = [...new Set(mine.filter((r) => r.solved > 0).map((r) => r.date))].sort();
  const daily = toDailyPoints(mine);

  // ── 랭킹 ──
  // 지표를 하나만 주면 "많이 푼 사람"만 계속 1등이라, 여러 지표를 한 번에 계산해
  // 내려보내고 화면에서 골라 보게 합니다. 순위는 지표마다 달라지므로 화면에서 매깁니다.
  const byUser = new Map<string, UserAgg>();
  for (const r of rows) {
    const a =
      byUser.get(r.userId) ??
      ({ solved: 0, correct: 0, seconds: 0, best: 0, dates: new Set<string>(), mastered: 0, lastLevelDate: "" } as UserAgg);
    a.solved += r.solved;
    a.correct += r.correct;
    a.seconds += r.seconds;
    a.best = Math.max(a.best, r.solved);
    if (r.solved > 0) a.dates.add(r.date);
    // 정복 수는 누적이 아니라 "가장 최근 스냅샷" 값입니다.
    if (r.levels && r.date >= a.lastLevelDate) {
      a.mastered = r.levels.done;
      a.lastLevelDate = r.date;
    }
    byUser.set(r.userId, a);
  }

  const createdAt = new Map(users.map((u) => [u.id, u.createdAt]));
  const nameOf = new Map(users.map((u) => [u.id, u.name]));

  // 가입일 순으로 미리 정렬해 두면, 화면에서 지표별로 정렬할 때
  // (JS sort 는 안정 정렬) 동점자가 가입 순으로 유지됩니다.
  const ranking: RankingRow[] = [...byUser.entries()]
    .filter(([, v]) => v.solved > 0)
    .sort(([a], [b]) => (createdAt.get(a) ?? "").localeCompare(createdAt.get(b) ?? ""))
    .map(([id, v]) => ({
      userId: id,
      name: nameOf.get(id) ?? "알 수 없음",
      isMe: id === userId,
      solved: v.solved,
      seconds: v.seconds,
      accuracy: v.solved > 0 ? round1((v.correct / v.solved) * 100) : 0,
      days: v.dates.size,
      streak: currentStreak(v.dates, today),
      mastered: v.mastered,
      best: v.best,
    }));

  return {
    date: today,
    subjectCode,
    today: totals(mine.filter((r) => r.date === today)),
    total: totals(mine),
    attendance,
    daily,
    trend: buildTrend(daily, today),
    ranking: ranking.slice(0, RANKING_LIMIT),
    visitors: {
      today: new Set(rows.filter((r) => r.date === today && r.solved > 0).map((r) => r.userId))
        .size,
      totalLearners: byUser.size,
    },
    comments,
  };
}
