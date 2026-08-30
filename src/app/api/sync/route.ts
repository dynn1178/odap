import { handle, ok, readJson } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { applyBatch } from "@/lib/service/sync";

export const dynamic = "force-dynamic";

/**
 * 배치 동기화 엔드포인트.
 * 10문제마다 / 60초마다 / 화면 이탈 시 / 탭 종료 시(sendBeacon) 호출됩니다.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const body = await readJson(req);
    const result = await applyBatch(session.userId, body.events);
    return ok(result);
  });
}
