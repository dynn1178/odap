import "server-only";
import { cached, purge, TTL } from "@/lib/cache";
import { COMMENT_COLS, SHEET } from "@/lib/sheets/schema";
import { Table } from "@/lib/sheets/table";
import { nowIso } from "@/lib/util/date";

import type { Comment } from "@/lib/domain/view-types";
export type { Comment };

const KEY = "comments";
export const MAX_COMMENT_LEN = 200;

/** 빈 값이면 undefined — 진도율/마스터율은 마일스톤 팝업에서 남긴 글에만 있는 선택 값입니다. */
function optPct(raw: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** 한줄남기기도 과목 하위 화면이므로 해당 과목 글만 보여줍니다 (최신 20개) */
export async function listComments(subjectCode: string, limit = 20): Promise<Comment[]> {
  const all = await cached(KEY, TTL.comments, async () => {
    const t = await Table.load(SHEET.comments);
    const rows: (Comment & { subjectCode: string })[] = [];
    for (const row of t.rows) {
      const body = t.get(row, COMMENT_COLS.body);
      if (!body) continue;
      rows.push({
        createdAt: t.opt(row, COMMENT_COLS.createdAt),
        subjectCode: t.opt(row, COMMENT_COLS.subjectCode),
        name: t.opt(row, COMMENT_COLS.name) || "익명",
        body,
        progressPct: optPct(t.opt(row, COMMENT_COLS.progressPct)),
        masteryPct: optPct(t.opt(row, COMMENT_COLS.masteryPct)),
      });
    }
    return rows;
  });

  return all
    .filter((c) => c.subjectCode === subjectCode)
    .slice(-limit)
    .reverse()
    .map(({ createdAt, name, body, progressPct, masteryPct }) => ({
      createdAt,
      name,
      body,
      progressPct,
      masteryPct,
    }));
}

export async function addComment(
  userId: string,
  name: string,
  subjectCode: string,
  body: string,
  extra?: { progressPct?: number; masteryPct?: number },
): Promise<void> {
  const t = await Table.load(SHEET.comments);
  // 과목코드 컬럼이 없으면 글이 어느 과목 것인지 잃어버립니다.
  t.col(COMMENT_COLS.subjectCode);
  const values: Record<string, string | number> = {
    [COMMENT_COLS.createdAt]: nowIso(),
    [COMMENT_COLS.userId]: userId,
    [COMMENT_COLS.subjectCode]: subjectCode,
    [COMMENT_COLS.name]: name,
    [COMMENT_COLS.body]: body.slice(0, MAX_COMMENT_LEN),
  };
  // 컬럼이 아직 없는 시트에서도 buildRow 가 모르는 키를 조용히 무시하므로 안전합니다.
  if (extra?.progressPct !== undefined) values[COMMENT_COLS.progressPct] = extra.progressPct;
  if (extra?.masteryPct !== undefined) values[COMMENT_COLS.masteryPct] = extra.masteryPct;
  await t.appendRow(values);
  purge(KEY);
}
