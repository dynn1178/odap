import "server-only";
import { cached, TTL } from "@/lib/cache";
import type { Question, Subject } from "@/lib/domain/types";
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
      if (!text) {
        warnings.push(`${rowNo}행(${id}): 문제 지문이 비어 있어 제외했습니다.`);
        return;
      }
      if (!answer) {
        warnings.push(`${rowNo}행(${id}): 정답이 비어 있어 제외했습니다.`);
        return;
      }

      // 보기: 빈칸 제거 + 중복 제거 (정답과 같은 오답도 제거)
      const raw = OPTION_COLS.map((c) => t.opt(row, c)).filter(Boolean);
      const options: string[] = [answer];
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

      seen.add(id);
      questions.push({
        id,
        text,
        answer,
        options,
        explanation: t.opt(row, QUESTION_COLS.explanation),
      });
    });

    // 문제 수 자체로는 경고하지 않습니다.
    // 진짜 한계는 "문제 개수"가 아니라 진도 셀의 글자 수(50,000자)이고,
    // 그건 동기화할 때 실제 길이로 검사합니다(isNearCellLimit). 개수 기반 경고는
    // 아직 아무 문제도 없는데 매번 뜨는 잡음이라 뺐습니다. 상한은 README 참고.

    return { questions, warnings };
  });
}
