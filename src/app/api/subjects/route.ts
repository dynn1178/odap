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
  seen: number;
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
        const records = Object.values(map) as { score: number }[];
        return {
          code: s.code,
          name: s.name,
          group: s.group,
          description: s.description,
          total: bank.questions.length,
          seen: records.length,
          knocking: records.filter((r) => r.score >= 7).length,
        };
      }),
    );

    return ok({ subjects: cards, loggedIn: Boolean(session) });
  });
}
