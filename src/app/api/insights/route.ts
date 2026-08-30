import { fail, handle, ok } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { getSubjectProgress } from "@/lib/repo/progress";
import { loadQuestionBank } from "@/lib/repo/questions";
import { findSubject } from "@/lib/repo/subjects";
import { emptyLevels, levelOf, weightOf } from "@/lib/domain/progress";
import { shuffle } from "@/lib/domain/select";
import type { InsightData, ReviewRow } from "@/lib/domain/view-types";

export const dynamic = "force-dynamic";

/**
 * 대시보드 "학습 인사이트".
 *
 * 예전에는 문제 1,000개를 전부 내려보내 표로 그렸는데, 과목이 커질수록
 * 응답이 수 MB 로 불고 화면도 느려졌습니다. 이제 서버에서 난이도 구간으로 접어
 * 요약만 내려보내고, 문제 단위로는 지금 가장 자주 노크당하는 몇 개만 붙입니다.
 */
const FOCUS_LIMIT = 8;

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const code = new URL(req.url).searchParams.get("subject")?.trim();
    if (!code) return fail("과목 코드가 필요합니다.");

    const subject = await findSubject(code);
    if (!subject) return fail("존재하지 않는 과목입니다.", 404);

    const [bank, { progress }] = await Promise.all([
      loadQuestionBank(subject),
      getSubjectProgress(session.userId, code),
    ]);

    const counts = emptyLevels();
    let attempted = 0;
    const focus: ReviewRow[] = [];

    for (const q of bank.questions) {
      const rec = progress[q.id];
      const correct = rec?.correct ?? 0;
      const wrong = rec?.wrong ?? 0;
      const total = correct + wrong;
      if (total === 0) continue;

      attempted += 1;
      counts[levelOf(rec?.score ?? 0)] += 1;

      focus.push({
        id: q.id,
        text: q.text,
        answer: q.answer,
        // 시트에서는 정답이 늘 맨 앞이라 상세 모달에서도 순서를 섞습니다.
        options: shuffle(q.options),
        explanation: q.explanation,
        score: rec?.score ?? 0,
        streak: rec?.streak ?? 0,
        correct,
        wrong,
        history: rec?.history ?? "",
        total,
        accuracy: Math.round((correct / total) * 1000) / 10,
        weight: weightOf(rec),
      });
    }

    focus.sort((a, b) => b.score - a.score || a.accuracy - b.accuracy || b.total - a.total);

    const data: InsightData = {
      subject: { code: subject.code, name: subject.name },
      levels: {
        counts,
        attempted,
        unseen: Math.max(0, bank.questions.length - attempted),
        total: bank.questions.length,
      },
      focus: focus.filter((r) => r.score > 0).slice(0, FOCUS_LIMIT),
    };

    return ok(data);
  });
}
