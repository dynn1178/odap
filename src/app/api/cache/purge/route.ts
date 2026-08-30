import { fail, handle, ok } from "@/lib/api";
import { purge } from "@/lib/cache";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * 문제 시트를 고친 직후 바로 반영하고 싶을 때 호출합니다 (기획안 3-2 ③).
 *   GET /api/cache/purge?token=...            → 전체 무효화
 *   GET /api/cache/purge?token=...&key=questions:ENG_WORD_1
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    const expected = env.cachePurgeToken;

    if (!expected) return fail("CACHE_PURGE_TOKEN 환경변수가 설정되어 있지 않습니다.", 501);
    if (token !== expected) return fail("토큰이 올바르지 않습니다.", 401);

    const key = url.searchParams.get("key") ?? undefined;
    purge(key);
    return ok({ purged: key ?? "all" });
  });
}
