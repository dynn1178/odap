import { fail, handle, ok, readJson } from "@/lib/api";
import { isValidName, isValidPin, normalizeName } from "@/lib/auth/pin";
import { setSession } from "@/lib/auth/session";
import { signup } from "@/lib/repo/users";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const name = normalizeName(String(body.name ?? ""));
    const pin = String(body.pin ?? "").trim();

    if (!isValidName(name)) return fail("이름은 1~20자로 입력해 주세요.");
    if (!isValidPin(pin)) return fail("번호는 숫자 4자리로 입력해 주세요.");

    const result = await signup(name, pin);
    if (!result.ok) {
      return fail("이미 사용 중인 이름/번호입니다. 다른 번호로 다시 입력해 주세요.", 409);
    }

    await setSession({ userId: result.user.id, name: result.user.name });
    return ok({ user: result.user });
  });
}
