import "server-only";
import { cached, TTL } from "@/lib/cache";
import type { Facing, Question, Subject } from "@/lib/domain/types";
import { acceptedAnswers } from "@/lib/domain/grade";
import { Table } from "@/lib/sheets/table";
import { OPTION_COLS, QUESTION_COLS } from "@/lib/sheets/schema";

export type QuestionBank = {
  questions: Question[];
  /** 시트 데이터 검증 경고 (기획안 2-1) */
  warnings: string[];
};

export function questionsCacheKey(subjectCode: string): string {
  return `questions:${subjectCode}`;
}

export async function loadQuestionBank(subject: Subject): Promise<QuestionBank> {
  return cached(questionsCacheKey(subject.code), TTL.questions, async () => {
    const t = await Table.load(subject.sheetName);
    const questions: Question[] = [];
    const warnings: string[] = [];
    const seen = new Set<string>();

    t.rows.forEach((row, i) => {
      const rowNo = t.rowNumber(i);
      const id = t.get(row, QUESTION_COLS.id);
      if (!id) return; // 빈 행은 조용히 무시

      const active = t.opt(row, QUESTION_COLS.active);
      if (active && active.toUpperCase() !== "Y") return;

      if (id.includes(":") || id.includes("|")) {
        warnings.push(`${rowNo}행: 문제ID "${id}" 에 ':' 또는 '|' 를 쓸 수 없습니다. 제외했습니다.`);
        return;
      }
      if (seen.has(id)) {
        warnings.push(`${rowNo}행: 문제ID "${id}" 가 중복됩니다. 뒤에 나온 행을 제외했습니다.`);
        return;
      }

      const text = t.get(row, QUESTION_COLS.text);
      const answer = t.get(row, QUESTION_COLS.answer);
      const open = t.opt(row, QUESTION_COLS.open).toUpperCase() === "Y";
      if (!text) {
        warnings.push(`${rowNo}행(${id}): 문제 지문이 비어 있어 제외했습니다.`);
        return;
      }
      if (!answer) {
        warnings.push(`${rowNo}행(${id}): 정답이 비어 있어 제외했습니다.`);
        return;
      }

      // 주관식은 보기를 쓰지 않습니다.
      let options: string[] = [];
      if (!open) {
        // 보기: 빈칸 제거 + 중복 제거 (정답과 같은 오답도 제거)
        const raw = OPTION_COLS.map((c) => t.opt(row, c)).filter(Boolean);
        options = [answer];
        let dupes = 0;
        for (const o of raw) {
          if (options.includes(o)) {
            dupes += 1;
            continue;
          }
          options.push(o);
        }
        if (dupes > 0) {
          warnings.push(`${rowNo}행(${id}): 중복된 보기 ${dupes}개를 제거했습니다.`);
        }
        if (options.length < 2) {
          warnings.push(`${rowNo}행(${id}): 보기가 2개 미만이라 제외했습니다.`);
          return;
        }
      }

      seen.add(id);
      questions.push({
        id,
        text,
        answer,
        options,
        open,
        explanation: t.opt(row, QUESTION_COLS.explanation),
      });
    });

    if (subject.bidirectional) addReverse(questions);

    // 문제 수 자체로는 경고하지 않습니다.
    // 진짜 한계는 "문제 개수"가 아니라 진도 셀의 글자 수(50,000자)이고,
    // 그건 동기화할 때 실제 길이로 검사합니다(isNearCellLimit). 개수 기반 경고는
    // 아직 아무 문제도 없는데 매번 뜨는 잡음이라 뺐습니다. 상한은 README 참고.

    return { questions, warnings };
  });
}

/** 한글이 섞여 있으면 한국어 쪽으로 봅니다 (영단어 과목의 오답 보기를 같은 언어로 맞추기 위해) */
function isHangul(text: string): boolean {
  return /[가-힣]/.test(text);
}

/**
 * 양방향 과목: 한 행에서 뒤집은 문제를 만들어 붙입니다.
 *
 * 역방향의 오답 보기는 시트에 없으므로 다른 행의 "문제"에서 뽑습니다.
 * 이때 정답과 같은 언어(한글/영문)끼리 뽑아야 "베개 / carrot / 바지" 같은
 * 이상한 보기가 나오지 않습니다.
 *
 * 뽑기는 문제ID 로 결정되므로, 같은 문제는 늘 같은 보기를 받습니다.
 */
function addReverse(questions: Question[]): void {
  const pool = { ko: [] as string[], en: [] as string[] };
  for (const q of questions) {
    (isHangul(q.text) ? pool.ko : pool.en).push(q.text);
  }

  for (const q of questions) {
    // 정답이 여러 개면 첫 번째를 문제로 씁니다.
    const [primary] = acceptedAnswers(q.answer, q.open);
    if (!primary) continue;

    const reverse: Facing = { text: primary, answer: q.text, options: [] };

    if (!q.open) {
      const same = isHangul(q.text) ? pool.ko : pool.en;
      const need = Math.max(1, q.options.length - 1);
      const picked = pickStable(same, q.text, need, hash(q.id));
      if (picked.length < 1) continue; // 오답을 못 만들면 역방향을 포기합니다
      reverse.options = [q.text, ...picked];
    }

    q.reverse = reverse;
  }
}

/** 문제ID 기반의 아주 단순한 해시 — 같은 문제에 늘 같은 보기를 주기 위한 용도입니다 */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** seed 에서 시작해 일정 간격으로 건너뛰며 서로 다른 값을 count 개 고릅니다 */
function pickStable(pool: string[], exclude: string, count: number, seed: number): string[] {
  if (pool.length <= 1) return [];
  const out: string[] = [];
  const step = 1 + (seed % Math.max(1, pool.length - 1));
  let i = seed % pool.length;
  for (let n = 0; n < pool.length && out.length < count; n++) {
    const candidate = pool[i];
    if (candidate !== exclude && !out.includes(candidate)) out.push(candidate);
    i = (i + step) % pool.length;
  }
  return out;
}
