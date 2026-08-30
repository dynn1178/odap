import { fail, handle, ok, readJson } from "@/lib/api";
import { checkThrottle, clearFailures, isValidPin, normalizeName, recordFailure } from "@/lib/auth/pin";
import { setSession } from "@/lib/auth/session";
import { authenticate } from "@/lib/repo/users";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const name = normalizeName(String(body.name ?? ""));
    const pin = String(body.pin ?? "").trim();

    if (!name) return fail("이름을 입력해 주세요.");
    if (!isValidPin(pin)) return fail("번호는 숫자 4자리로 입력해 주세요.");

    const throttle = checkThrottle(name);
    if (throttle.blocked) {
      return fail(`시도가 너무 많습니다. ${throttle.retryAfterSec}초 후에 다시 시도해 주세요.`, 429);
    }

    const user = await authenticate(name, pin);
    if (!user) {
      recordFailure(name);
      return fail("이름 또는 번호가 맞지 않아요.", 401);
    }

    clearFailures(name);
    await setSession({ userId: user.id, name: user.name });
    return ok({ user });
  });
}
