import "server-only";

/**
 * 서버 in-memory TTL 캐시 (기획안 3-2 ③).
 * 문제은행처럼 자주 바뀌지 않는 데이터를 감싸 Sheets API 호출을 없앱니다.
 * 서버리스에서는 인스턴스마다 별도 캐시지만, 그래도 대부분의 요청을 막아 줍니다.
 */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const TTL = {
  /** 문제은행 15분 */
  questions: 15 * 60_000,
  /** 과목목록 15분 */
  subjects: 15 * 60_000,
  /** 한줄남기기 60초 */
  comments: 60_000,
  /** 대시보드 집계 60초 */
  dashboard: 60_000,
} as const;

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  // 같은 키에 대한 동시 요청은 한 번만 로드합니다.
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = load()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, p);
  return p;
}

export function purge(key?: string): void {
  if (key) {
    store.delete(key);
    return;
  }
  store.clear();
}
