import type { AnswerKind, ProgressMap, Record0 } from "./types";

/** 기획안 2-3 */
export const MAX_SCORE = 10;
/** 이력 문자열 보관 길이 */
export const HISTORY_LEN = 12;
/** 아직 한 번도 안 풀어본 문제의 노출 가중치 (신규 우선 노출 보너스) */
export const NEW_QUESTION_WEIGHT = 3;
/** 최근 출제 제외 개수 상한 */
export const RECENT_EXCLUDE = 5;

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
 * score 를 세 구간으로 접어 "얼마나 정복했는지"만 봅니다.
 *
 * 구간을 3개로 둔 이유: 4개로 나누면 인접한 두 색이 색각이상에서 구분되지 않습니다.
 */
export const LEVEL_BANDS = [
  { key: "done", label: "정복", hint: "score 0" },
  { key: "mid", label: "익숙", hint: "score 1–3" },
  { key: "hot", label: "노크 중", hint: `score 4–${MAX_SCORE}` },
] as const;

export type LevelKey = (typeof LEVEL_BANDS)[number]["key"];
export type LevelCounts = Record<LevelKey, number>;

export function emptyLevels(): LevelCounts {
  return { done: 0, mid: 0, hot: 0 };
}

export function levelOf(score: number): LevelKey {
  const s = clampScore(score);
  if (s === 0) return "done";
  if (s <= 3) return "mid";
  return "hot";
}

/** 한 번이라도 풀어본 문제만 셉니다 (안 풀어본 문제는 "미출제"로 따로 셉니다). */
export function countLevels(map: ProgressMap): LevelCounts {
  const counts = emptyLevels();
  for (const rec of Object.values(map)) {
    if (rec.correct + rec.wrong === 0) continue;
    counts[levelOf(rec.score)] += 1;
  }
  return counts;
}

export function totalLevels(c: LevelCounts): number {
  return c.done + c.mid + c.hot;
}

/** 일별통계 셀에 "정복,익숙,노크중" 한 칸으로 저장합니다. */
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
