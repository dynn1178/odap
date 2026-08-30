import "server-only";
import { cached, purge, TTL } from "@/lib/cache";
import { COMMENT_COLS, SHEET } from "@/lib/sheets/schema";
import { Table } from "@/lib/sheets/table";
import { nowIso } from "@/lib/util/date";

import type { Comment } from "@/lib/domain/view-types";
export type { Comment };

const KEY = "comments";
export const MAX_COMMENT_LEN = 200;

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
      });
    }
    return rows;
  });

  return all
    .filter((c) => c.subjectCode === subjectCode)
    .slice(-limit)
    .reverse()
    .map(({ createdAt, name, body }) => ({ createdAt, name, body }));
}

export async function addComment(
  userId: string,
  name: string,
  subjectCode: string,
  body: string,
): Promise<void> {
  const t = await Table.load(SHEET.comments);
  // 과목코드 컬럼이 없으면 글이 어느 과목 것인지 잃어버립니다.
  t.col(COMMENT_COLS.subjectCode);
  await t.appendRow({
    [COMMENT_COLS.createdAt]: nowIso(),
    [COMMENT_COLS.userId]: userId,
    [COMMENT_COLS.subjectCode]: subjectCode,
    [COMMENT_COLS.name]: name,
    [COMMENT_COLS.body]: body.slice(0, MAX_COMMENT_LEN),
  });
  purge(KEY);
}
