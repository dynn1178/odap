import { handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { getAllProgress } from "@/lib/repo/progress";
import { loadQuestionBank } from "@/lib/repo/questions";
import { listSubjects } from "@/lib/repo/subjects";

export const dynamic = "force-dynamic";

export type SubjectCard = {
  code: string;
  name: string;
  group: string;
  description: string;
  total: number;
  /** 한 번이라도 만나본 문제 수 */
  seen: number;
  /** 지금까지 이 과목에서 문제를 푼 총 횟수 (같은 문제를 여러 번 풀면 그만큼 늘어납니다) */
  solved: number;
  knocking: number;
};

export async function GET() {
  return handle(async () => {
    const [subjects, session] = await Promise.all([listSubjects(), getSession()]);
    const progress = session ? await getAllProgress(session.userId) : new Map();

    const cards: SubjectCard[] = await Promise.all(
      subjects.map(async (s) => {
        const bank = await loadQuestionBank(s);
        const map = progress.get(s.code) ?? {};
        const records = Object.values(map) as { score: number; correct: number; wrong: number }[];
        return {
          code: s.code,
          name: s.name,
          group: s.group,
          description: s.description,
          total: bank.questions.length,
          seen: records.length,
          solved: records.reduce((n, r) => n + r.correct + r.wrong, 0),
          knocking: records.filter((r) => r.score >= 7).length,
        };
      }),
    );

    // 많이 푼 과목이 앞에 옵니다.
    // JS sort 는 안정 정렬이고 subjects 가 이미 노출순서대로 와 있어서,
    // 아직 안 푼 과목과 동점 과목은 시트의 노출순서를 그대로 따릅니다.
    cards.sort((a, b) => b.solved - a.solved);

    return ok({ subjects: cards, loggedIn: Boolean(session) });
  });
}
