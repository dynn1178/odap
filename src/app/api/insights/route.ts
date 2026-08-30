import { fail, handle, ok } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { getSubjectProgress } from "@/lib/repo/progress";
import { loadQuestionBank } from "@/lib/repo/questions";
import { findSubject } from "@/lib/repo/subjects";
import { emptyLevels, levelOf, weightOf } from "@/lib/domain/progress";
import { shuffle } from "@/lib/domain/select";
import { isAnswerKind, isCorrectKind } from "@/lib/domain/types";
import type { FocusBucket, InsightData, ReviewRow } from "@/lib/domain/view-types";

export const dynamic = "force-dynamic";

/**
 * 대시보드 "학습 인사이트".
 *
 * 문제 1,000개를 전부 내려보내면 응답이 수 MB 로 붑니다. 서버에서 난이도 구간으로 접어
 * 요약만 내려보내고, 문제 단위로는 "심화 학습 묶음"에 필요한 만큼만 붙입니다.
 * 응답 크기는 과목 크기와 무관하게 일정합니다.
 */
const ROWS_PER_BUCKET = 10;

/** 정답률이 낮다고 말하려면 최소한 몇 번은 풀어봤어야 합니다. */
const WEAK_MIN_TRIES = 3;

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
    const all: ReviewRow[] = [];

    for (const q of bank.questions) {
      const rec = progress[q.id];
      const correct = rec?.correct ?? 0;
      const wrong = rec?.wrong ?? 0;
      const total = correct + wrong;
      if (total > 0) {
        attempted += 1;
        counts[levelOf(rec?.score ?? 0)] += 1;
      }

      all.push({
        id: q.id,
        text: q.text,
        answer: q.answer,
        // 시트에서는 정답이 늘 맨 앞이라 상세 모달에서도 순서를 섞습니다.
        options: shuffle(q.options),
        open: q.open,
        reverseText: q.reverse?.text,
        explanation: q.explanation,
        score: rec?.score ?? 0,
        streak: rec?.streak ?? 0,
        correct,
        wrong,
        history: rec?.history ?? "",
        total,
        accuracy: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
        weight: weightOf(rec),
      });
    }

    /** 마지막 응답이 오답이었는지 */
    const missedLast = (r: ReviewRow) => {
      const last = r.history.slice(-1);
      return isAnswerKind(last) && !isCorrectKind(last);
    };

    const bucket = (
      key: FocusBucket["key"],
      label: string,
      hint: string,
      filter: (r: ReviewRow) => boolean,
      sort: (a: ReviewRow, b: ReviewRow) => number,
      pickRandom = false,
    ): FocusBucket => {
      const matched = all.filter(filter);
      const rows = pickRandom
        ? shuffle(matched).slice(0, ROWS_PER_BUCKET)
        : [...matched].sort(sort).slice(0, ROWS_PER_BUCKET);
      return { key, label, hint, rows, total: matched.length };
    };

    const byScore = (a: ReviewRow, b: ReviewRow) => b.score - a.score || b.total - a.total;

    const buckets: FocusBucket[] = [
      bucket(
        "knocking",
        "자주 노크 중",
        "가장 자주 다시 나오는 문제들이에요",
        (r) => r.score >= 4,
        byScore,
      ),
      bucket(
        "weak",
        "약한 문제",
        `${WEAK_MIN_TRIES}번 이상 풀었는데 정답률이 낮은 문제예요`,
        (r) => r.total >= WEAK_MIN_TRIES && r.accuracy < 60,
        (a, b) => a.accuracy - b.accuracy || b.total - a.total,
      ),
      bucket(
        "recent",
        "최근에 틀림",
        "마지막에 틀렸던 문제만 모았어요",
        (r) => missedLast(r),
        byScore,
      ),
      bucket(
        "almost",
        "마스터 직전",
        "한 번만 더 맞히면 마스터에 가까워져요",
        (r) => r.score >= 1 && r.score <= 2,
        (a, b) => a.score - b.score || b.streak - a.streak,
      ),
      bucket(
        "unseen",
        "아직 안 만난 문제",
        "한 번도 나오지 않은 문제 중에서 뽑았어요",
        (r) => r.total === 0,
        byScore,
        true,
      ),
    ];

    const data: InsightData = {
      subject: { code: subject.code, name: subject.name },
      levels: {
        counts,
        attempted,
        unseen: Math.max(0, bank.questions.length - attempted),
        total: bank.questions.length,
      },
      buckets: buckets.filter((b) => b.total > 0),
    };

    return ok(data);
  });
}
