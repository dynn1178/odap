import { RECENT_EXCLUDE, REVIEW_EVERY, reviewWeightOf, weightOf } from "./progress";
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
 * 가중 랜덤 추첨. 가중치 합이 0 이면(= 뽑을 게 없으면) undefined 를 돌려줍니다.
 */
function weightedPick(
  pool: readonly Question[],
  weight: (q: Question) => number,
): Question | undefined {
  const weights = pool.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return undefined;

  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * 기획안 2-3 출제 로직.
 *  1) 최근 출제 N개를 후보에서 제외 (N = min(5, 후보수 - 1))
 *  2) REVIEW_EVERY 번째 문제는 "복습 슬롯" — 이미 본 문제 중에서 뽑습니다.
 *  3) 그 외에는 가중치 = 미출제 3 / 그 외 1 + score 로 가중 랜덤 추첨
 *
 * `turn` 은 이 과목에서 지금까지 낸 문제 수입니다. 복습 슬롯 주기를 세는 데만 쓰고,
 * 넘기지 않으면(0) 복습 슬롯 없이 예전과 똑같이 동작합니다.
 */
export function pickNextQuestion(
  questions: readonly Question[],
  progress: ProgressMap,
  recentIds: readonly string[],
  turn = 0,
): Question | undefined {
  if (questions.length === 0) return undefined;

  const excludeCount = Math.max(0, Math.min(RECENT_EXCLUDE, questions.length - 1));
  const excluded = new Set(recentIds.slice(-excludeCount));

  let pool = questions.filter((q) => !excluded.has(q.id));
  if (pool.length === 0) pool = [...questions]; // 안전장치

  // 복습 슬롯. 아직 풀어 본 문제가 없으면 가중치 합이 0 이라 평소 출제로 넘어갑니다.
  if (turn > 0 && turn % REVIEW_EVERY === 0) {
    const review = weightedPick(pool, (q) => reviewWeightOf(progress[q.id]));
    if (review) return review;
  }

  return weightedPick(pool, (q) => weightOf(progress[q.id])) ?? pickRandom(pool);
}
