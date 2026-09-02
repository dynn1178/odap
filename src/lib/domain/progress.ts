import type { AnswerKind, ProgressMap, Record0 } from "./types";

/** 기획안 2-3 */
export const MAX_SCORE = 10;
/** 이력 문자열 보관 길이 */
export const HISTORY_LEN = 12;
/** 아직 한 번도 안 풀어본 문제의 노출 가중치 (신규 우선 노출 보너스) */
export const NEW_QUESTION_WEIGHT = 3;
/** 최근 출제 제외 개수 상한 */
export const RECENT_EXCLUDE = 5;

/**
 * 복습 슬롯 주기 — 이 배수 번째 문제는 "이미 본 문제" 중에서만 뽑습니다.
 *
 * 미출제 문제에 노출 보너스(NEW_QUESTION_WEIGHT)가 붙어 있어서, 문제가 500개쯤 되면
 * 한참을 풀어도 뽑히는 건 거의 다 처음 보는 문제입니다. 마스터는 같은 문제를
 * 두 번 맞혀야 되므로(MASTER_MIN_CORRECT) 500개를 다 훑기 전까지 마스터율이 0에
 * 붙어 있게 됩니다. 그래서 네 문제 중 한 번은 복습 몫으로 떼어 둡니다.
 */
export const REVIEW_EVERY = 4;

/** 마스터 직전(score 0 · 정답 1회) 문제의 복습 가중치 — 한 번만 더 맞히면 마스터입니다 */
export const REVIEW_NEAR_MASTER_WEIGHT = 8;
/** 이미 마스터한 문제의 복습 가중치 — 잊지 않았는지만 확인하므로 낮게 둡니다 */
export const REVIEW_MASTERED_WEIGHT = 1;

export function emptyRecord(): Record0 {
  return { score: 0, streak: 0, correct: 0, wrong: 0, history: "" };
}

/** score 를 1 낮추기 위해 필요한 연속 "확실히 앎" 정답 수 */
export function requiredStreak(score: number): number {
  return Math.max(1, Math.ceil(score / 2));
}

/** 노출 가중치 = 1 + score (미출제 문제는 NEW_QUESTION_WEIGHT) */
export function weightOf(rec: Record0 | undefined): number {
  if (!rec) return NEW_QUESTION_WEIGHT;
  return 1 + clampScore(rec.score);
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, Math.trunc(n)));
}

/**
 * ─── 난이도 구간 (대시보드 분포/추이) ───
 * 문제 1,000개를 한 줄씩 보여주면 느리고 읽히지도 않아서,
 * score 를 세 구간으로 접어 "얼마나 마스터했는지"만 봅니다.
 *
 * 구간을 3개로 둔 이유: 4개로 나누면 인접한 두 색이 색각이상에서 구분되지 않습니다.
 */
export const LEVEL_BANDS = [
  { key: "done", label: "마스터", hint: "score 0 · 정답 2회+" },
  { key: "mid", label: "익숙", hint: "score 1–3 · 정답 1회" },
  { key: "hot", label: "노크 중", hint: `score 4–${MAX_SCORE}` },
] as const;

export type LevelKey = (typeof LEVEL_BANDS)[number]["key"];
export type LevelCounts = Record<LevelKey, number>;

export function emptyLevels(): LevelCounts {
  return { done: 0, mid: 0, hot: 0 };
}

/**
 * 마스터로 인정하는 최소 정답 횟수.
 *
 * 처음 만난 문제도 score 는 0 에서 시작하므로, score 만 보면
 * 첫 만남에 "확실히 앎" 한 번 누른 문제가 곧바로 마스터가 됩니다.
 * 한 번 더 맞혀서 확인된 문제만 마스터로 셉니다.
 */
export const MASTER_MIN_CORRECT = 2;

/**
 * 구간 판정의 유일한 기준입니다. score 만으로는 부족해서 기록 전체를 받습니다.
 * score 0 인데 아직 한 번밖에 못 맞힌 문제는 "마스터 직전"이라 익숙으로 둡니다.
 */
export function levelOf(rec: Record0): LevelKey {
  const s = clampScore(rec.score);
  if (s === 0) return rec.correct >= MASTER_MIN_CORRECT ? "done" : "mid";
  if (s <= 3) return "mid";
  return "hot";
}

/** 한 번이라도 풀어본 문제만 셉니다 (안 풀어본 문제는 "미출제"로 따로 셉니다). */
export function countLevels(map: ProgressMap): LevelCounts {
  const counts = emptyLevels();
  for (const rec of Object.values(map)) {
    if (rec.correct + rec.wrong === 0) continue;
    counts[levelOf(rec)] += 1;
  }
  return counts;
}

export function totalLevels(c: LevelCounts): number {
  return c.done + c.mid + c.hot;
}

/**
 * ─── 진도율 / 마스터율 ───
 * 분모는 둘 다 "과목의 전체 문제 수"입니다. 분모를 다르게 잡으면
 * "진도율 60%인데 마스터율 80%" 같은 읽을 수 없는 조합이 나옵니다.
 * 같은 분모를 쓰므로 마스터율은 언제나 진도율 이하입니다.
 */
export type StudyStats = {
  /** 과목의 전체 문제 수 */
  total: number;
  /** 한 번이라도 풀어 본 문제 수 (진도율의 분자) */
  seen: number;
  /** 마스터한 문제 수 (마스터율의 분자) */
  mastered: number;
};

/** 대시보드의 "마스터" 구간과 같은 뜻입니다 — 정의가 갈라지지 않게 levelOf 하나만 봅니다. */
export function isMastered(rec: Record0 | undefined): boolean {
  if (!rec || rec.correct + rec.wrong === 0) return false;
  return levelOf(rec) === "done";
}

/**
 * 복습 슬롯에서 쓰는 가중치. 평소 가중치(weightOf)와 두 군데가 다릅니다.
 *  - 미출제 문제는 0 — 복습 슬롯은 "이미 본 문제"만 다룹니다.
 *  - 마스터 직전 문제가 가장 높습니다. 여기가 막혀서 마스터율이 안 오르던 자리입니다.
 * score 가 남은 문제는 평소와 같은 비중이라, 복습이라고 해서 갑자기 순서가 뒤바뀌지 않습니다.
 */
export function reviewWeightOf(rec: Record0 | undefined): number {
  if (!rec || rec.correct + rec.wrong === 0) return 0;
  const s = clampScore(rec.score);
  if (s > 0) return 1 + s;
  return isMastered(rec) ? REVIEW_MASTERED_WEIGHT : REVIEW_NEAR_MASTER_WEIGHT;
}

export function countStudyStats(ids: string[], map: ProgressMap): StudyStats {
  const stats: StudyStats = { total: ids.length, seen: 0, mastered: 0 };
  for (const id of ids) {
    const rec = map[id];
    if (!rec || rec.correct + rec.wrong === 0) continue;
    stats.seen += 1;
    if (isMastered(rec)) stats.mastered += 1;
  }
  return stats;
}

/** 일별통계 셀에 "마스터,익숙,노크중" 한 칸으로 저장합니다. */
export function serializeLevels(c: LevelCounts): string {
  return `${c.done},${c.mid},${c.hot}`;
}

export function parseLevels(raw: string | undefined | null): LevelCounts | null {
  if (!raw) return null;
  const f = raw.split(",");
  if (f.length < 3) return null;
  const counts: LevelCounts = { done: num(f[0]), mid: num(f[1]), hot: num(f[2]) };
  return totalLevels(counts) > 0 ? counts : null;
}

/** 각 버튼이 score 에 주는 변화량 (UI 배지 표기용) */
export const SCORE_DELTA: Record<AnswerKind, number> = {
  S: -1,
  L: +1,
  "1": +1,
  "2": +2,
  "3": +3,
};

/**
 * 기획안 2-3 갱신 규칙. 순수 함수이므로 클라이언트 미리보기와 서버 반영이 항상 같은 결과를 냅니다.
 */
export function applyAnswer(prev: Record0 | undefined, kind: AnswerKind): Record0 {
  const base = prev ? { ...prev } : emptyRecord();
  base.score = clampScore(base.score);

  if (kind === "S") {
    base.streak += 1;
    base.correct += 1;
    if (base.score > 0 && base.streak >= requiredStreak(base.score)) {
      base.score -= 1;
      base.streak = 0;
    }
    if (base.score === 0) base.streak = 0;
  } else if (kind === "L") {
    base.correct += 1;
    base.score = clampScore(base.score + 1);
    base.streak = 0;
  } else {
    base.wrong += 1;
    base.score = clampScore(base.score + SCORE_DELTA[kind]);
    base.streak = 0;
  }

  base.history = (base.history + kind).slice(-HISTORY_LEN);
  return base;
}

/**
 * ─── 압축 문자열 포맷 (기획안 3-3) ───
 *   문제ID:score,streak,정답수,오답수,최근이력
 * 을 "|" 로 이어 붙입니다.  예) 12:3,1,5,2,SS1L2|57:0,0,3,0,SSS
 *
 * 문제ID 에 ":" 나 "|" 가 들어가면 포맷이 깨지므로 직렬화 시 걸러냅니다.
 */
export function serializeProgress(map: ProgressMap): string {
  const parts: string[] = [];
  for (const [id, r] of Object.entries(map)) {
    if (!id || id.includes(":") || id.includes("|")) continue;
    parts.push(`${id}:${r.score},${r.streak},${r.correct},${r.wrong},${r.history}`);
  }
  return parts.join("|");
}

export function parseProgress(raw: string | undefined | null): ProgressMap {
  const map: ProgressMap = {};
  if (!raw) return map;
  const text = raw.trim();
  if (!text) return map;

  // 이전 버전에서 JSON 으로 저장된 데이터도 읽어 줍니다.
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>;
      for (const [id, v] of Object.entries(obj)) {
        if (Array.isArray(v)) {
          map[id] = {
            score: num(v[0]),
            streak: num(v[1]),
            correct: num(v[2]),
            wrong: num(v[3]),
            history: typeof v[4] === "string" ? v[4] : "",
          };
        }
      }
      return map;
    } catch {
      return map;
    }
  }

  for (const part of text.split("|")) {
    if (!part) continue;
    const sep = part.indexOf(":");
    if (sep <= 0) continue;
    const id = part.slice(0, sep);
    const f = part.slice(sep + 1).split(",");
    map[id] = {
      score: clampScore(num(f[0])),
      streak: num(f[1]),
      correct: num(f[2]),
      wrong: num(f[3]),
      history: (f[4] ?? "").slice(-HISTORY_LEN),
    };
  }
  return map;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
}

/** 셀 50,000자 한도 대비 경고용 */
export const CELL_LIMIT = 50_000;

export function isNearCellLimit(serialized: string): boolean {
  return serialized.length > CELL_LIMIT * 0.8;
}
