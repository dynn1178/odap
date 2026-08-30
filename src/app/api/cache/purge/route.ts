import { fail, handle, ok } from "@/lib/api";
import { purge } from "@/lib/cache";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * 문제 시트를 고친 직후 바로 반영하고 싶을 때 호출합니다 (기획안 3-2 ③).
 *
 *   GET /api/cache/purge?token=...              → 전체 무효화 (외부 스크립트용)
 *   GET /api/cache/purge?token=...&key=questions:ENG_WORD_1
 *   GET /api/cache/purge?key=questions:ENG_WORD_1   → 로그인 상태면 토큰 없이도 됨
 *
 * 캐시를 지우는 건 다음 요청에서 시트를 한 번 더 읽는 것뿐이라 위험한 동작이 아닙니다.
 * 로그인한 사람이 화면에서 [시트 다시 읽기] 를 누를 때마다 토큰을 넣게 할 이유가 없어
 * 세션도 인증으로 인정합니다.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const expected = env.cachePurgeToken;

    if (token !== null) {
      if (!expected) return fail("CACHE_PURGE_TOKEN 환경변수가 설정되어 있지 않습니다.", 501);
      if (token !== expected) return fail("토큰이 올바르지 않습니다.", 401);
    } else if (!(await getSession())) {
      return fail("로그인이 필요합니다.", 401);
    }

    const key = url.searchParams.get("key") ?? undefined;
    purge(key);
    return ok({ purged: key ?? "all" });
  });
}
