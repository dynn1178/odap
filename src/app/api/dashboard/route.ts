import { fail, handle, ok } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { findSubject } from "@/lib/repo/subjects";
import { buildDashboard } from "@/lib/service/dashboard";

export const dynamic = "force-dynamic";

/** 대시보드는 과목 하위 화면이라 subject 파라미터가 필수입니다. */
export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const code = new URL(req.url).searchParams.get("subject")?.trim();
    if (!code) return fail("과목 코드가 필요합니다.");

    const subject = await findSubject(code);
    if (!subject) return fail("존재하지 않는 과목입니다.", 404);

    const data = await buildDashboard(session.userId, code);
    return ok({ ...data, subject: { code: subject.code, name: subject.name }, me: session });
  });
}
