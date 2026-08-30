import { handle, ok } from "@/lib/api";
import { clearSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  return handle(async () => {
    await clearSession();
    return ok({ ok: true });
  });
}
