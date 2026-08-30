import { RECENT_EXCLUDE, weightOf } from "./progress";
import type { ProgressMap, Question } from "./types";

/** Fisher-Yates 셔플 (원본 배열을 건드리지 않습니다) */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * 기획안 2-3 출제 로직.
 *  1) 최근 출제 N개를 후보에서 제외 (N = min(5, 후보수 - 1))
 *  2) 가중치 = 미출제 3 / 그 외 1 + score 로 가중 랜덤 추첨
 */
export function pickNextQuestion(
  questions: readonly Question[],
  progress: ProgressMap,
  recentIds: readonly string[],
): Question | undefined {
  if (questions.length === 0) return undefined;

  const excludeCount = Math.max(0, Math.min(RECENT_EXCLUDE, questions.length - 1));
  const excluded = new Set(recentIds.slice(-excludeCount));

  let pool = questions.filter((q) => !excluded.has(q.id));
  if (pool.length === 0) pool = [...questions]; // 안전장치

  const weights = pool.map((q) => weightOf(progress[q.id]));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pickRandom(pool);

  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
