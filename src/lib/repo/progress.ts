import "server-only";
import { parseProgress, serializeProgress } from "@/lib/domain/progress";
import type { ProgressMap } from "@/lib/domain/types";
import {
  a1,
  appendValues,
  batchGetValues,
  batchUpdateValues,
  getValues,
  type Grid,
} from "@/lib/sheets/client";
import { buildRow, cellRange, columnRange, loadHeaders, rowRange } from "@/lib/sheets/headers";
import { PROGRESS_COLS, SHEET } from "@/lib/sheets/schema";
import { nowIso } from "@/lib/util/date";

/**
 * 진도 시트는 셀 하나가 매우 클 수 있으므로(문제 1,000개 ≈ 26,000자)
 * 시트를 통째로 읽지 않고 "키 컬럼만" 스캔해 행 번호를 찾은 뒤,
 * 필요한 셀만 골라 읽습니다.
 */

export type ProgressLocation = { subjectCode: string; rowNumber: number };

/** 진도 시트에서 키 컬럼(회원ID / 과목코드) 범위 — 배치 읽기용 */
export async function keyColumnRanges(): Promise<[string, string]> {
  const h = await loadHeaders(SHEET.progress);
  return [columnRange(h, PROGRESS_COLS.userId), columnRange(h, PROGRESS_COLS.subjectCode)];
}

/** 키 컬럼 값에서 (과목코드 → 행 번호) 를 만듭니다. 헤더가 1행이므로 행 번호 = i + 2 */
export function indexRows(userCol: Grid, subjectCol: Grid, userId: string): Map<string, number> {
  const found = new Map<string, number>();
  const len = Math.max(userCol.length, subjectCol.length);
  for (let i = 0; i < len; i++) {
    if ((userCol[i]?.[0] ?? "").trim() !== userId) continue;
    const s = (subjectCol[i]?.[0] ?? "").trim();
    if (!s || found.has(s)) continue;
    found.set(s, i + 2);
  }
  return found;
}

export async function locateRows(userId: string): Promise<Map<string, number>> {
  const [uRange, sRange] = await keyColumnRanges();
  const [userCol, subjectCol] = await batchGetValues([uRange, sRange]);
  return indexRows(userCol, subjectCol, userId);
}

/** 지정한 행들의 진도데이터 셀만 읽어 파싱 */
export async function readProgressCells(
  locations: ProgressLocation[],
): Promise<Map<string, ProgressMap>> {
  const out = new Map<string, ProgressMap>();
  if (locations.length === 0) return out;

  const h = await loadHeaders(SHEET.progress);
  const grids = await batchGetValues(
    locations.map((l) => cellRange(h, PROGRESS_COLS.data, l.rowNumber)),
  );

  locations.forEach((l, i) => {
    out.set(l.subjectCode, parseProgress(grids[i]?.[0]?.[0]));
  });
  return out;
}

/** 한 과목의 진도를 읽습니다 (문제풀이 화면 진입 시) */
export async function getSubjectProgress(
  userId: string,
  subjectCode: string,
): Promise<{ progress: ProgressMap; rowNumber: number | null }> {
  const rows = await locateRows(userId);
  const rowNumber = rows.get(subjectCode) ?? null;
  if (rowNumber === null) return { progress: {}, rowNumber: null };

  const h = await loadHeaders(SHEET.progress);
  const grid = await getValues(cellRange(h, PROGRESS_COLS.data, rowNumber));
  return { progress: parseProgress(grid?.[0]?.[0]), rowNumber };
}

/** 대시보드 장표용 — 이 사용자의 모든 과목 진도 */
export async function getAllProgress(userId: string): Promise<Map<string, ProgressMap>> {
  const rows = await locateRows(userId);
  return readProgressCells(
    [...rows.entries()].map(([subjectCode, rowNumber]) => ({ subjectCode, rowNumber })),
  );
}

export type ProgressWrite = {
  subjectCode: string;
  rowNumber: number | null;
  progress: ProgressMap;
};

/** 갱신 대상을 batchUpdate 용 range/values 와 append 용 행으로 나눕니다. */
export async function buildProgressWrites(
  userId: string,
  writes: ProgressWrite[],
): Promise<{ updates: { range: string; values: string[][] }[]; appends: string[][] }> {
  const h = await loadHeaders(SHEET.progress);
  const now = nowIso();
  const updates: { range: string; values: string[][] }[] = [];
  const appends: string[][] = [];

  for (const w of writes) {
    const values = {
      [PROGRESS_COLS.userId]: userId,
      [PROGRESS_COLS.subjectCode]: w.subjectCode,
      [PROGRESS_COLS.data]: serializeProgress(w.progress),
      [PROGRESS_COLS.updatedAt]: now,
    };
    if (w.rowNumber === null) appends.push(buildRow(h, values));
    else updates.push({ range: rowRange(h, w.rowNumber), values: [buildRow(h, values)] });
  }
  return { updates, appends };
}

export async function appendProgressRows(rows: string[][]): Promise<void> {
  if (rows.length === 0) return;
  await appendValues(a1(SHEET.progress, "A1"), rows);
}

/** 단독 저장용 (배치 동기화는 sync 서비스가 묶어서 처리합니다) */
export async function saveProgress(userId: string, writes: ProgressWrite[]): Promise<void> {
  if (writes.length === 0) return;
  const { updates, appends } = await buildProgressWrites(userId, writes);
  await batchUpdateValues(updates);
  await appendProgressRows(appends);
}
