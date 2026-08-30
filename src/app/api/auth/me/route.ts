import { handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ok({ user: await getSession() }));
}
