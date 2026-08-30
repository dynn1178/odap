import { fail, handle, ok } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { getSubjectProgress } from "@/lib/repo/progress";
import { loadQuestionBank } from "@/lib/repo/questions";
import { findSubject } from "@/lib/repo/subjects";

export const dynamic = "force-dynamic";

/**
 * 과목 진입 시 1회만 호출합니다.
 * 문제 전체 + 내 진도를 한 번에 받아 두면, 이후 문제를 넘길 때 네트워크 호출이 0회입니다.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const code = new URL(req.url).searchParams.get("subject")?.trim();
    if (!code) return fail("과목 코드가 필요합니다.");

    const subject = await findSubject(code);
    if (!subject) return fail("존재하지 않는 과목입니다.", 404);

    const [bank, progress] = await Promise.all([
      loadQuestionBank(subject),
      getSubjectProgress(session.userId, code),
    ]);

    return ok({
      subject: { code: subject.code, name: subject.name, group: subject.group },
      questions: bank.questions,
      warnings: bank.warnings,
      progress: progress.progress,
    });
  });
}
