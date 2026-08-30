import "server-only";
import { cached } from "@/lib/cache";
import { a1, colLetter, getValues } from "./client";

/**
 * 시트의 1행(헤더)만 따로 읽어 캐시합니다.
 * 헤더를 알면 "필요한 열만" 골라 읽을 수 있어서, 진도 시트처럼 셀이 큰 시트를
 * 통째로 읽지 않고 키 컬럼만 스캔할 수 있습니다.
 */
export type Headers = {
  sheetName: string;
  names: string[];
  index: Map<string, number>;
};

const HEADER_TTL = 15 * 60_000;

export async function loadHeaders(sheetName: string): Promise<Headers> {
  return cached(`headers:${sheetName}`, HEADER_TTL, async () => {
    const grid = await getValues(a1(sheetName, "1:1"));
    const names = (grid[0] ?? []).map((h) => (h ?? "").trim());
    const index = new Map<string, number>();
    names.forEach((h, i) => {
      if (h && !index.has(h)) index.set(h, i);
    });
    if (index.size === 0) {
      throw new Error(
        `시트 "${sheetName}" 의 1행에 헤더가 없습니다. npm run setup:sheets 로 기본 시트를 만들 수 있습니다.`,
      );
    }
    return { sheetName, names, index };
  });
}

export function colIndex(h: Headers, name: string): number {
  const i = h.index.get(name);
  if (i === undefined) {
    throw new Error(
      `시트 "${h.sheetName}" 의 1행에 "${name}" 컬럼이 없습니다. (현재 헤더: ${h.names.join(", ") || "없음"})`,
    );
  }
  return i;
}

/** 데이터 영역(2행부터)의 특정 컬럼 전체 범위 */
export function columnRange(h: Headers, name: string): string {
  const L = colLetter(colIndex(h, name));
  return a1(h.sheetName, `${L}2:${L}`);
}

/** 특정 행/컬럼의 셀 하나 */
export function cellRange(h: Headers, name: string, rowNumber: number): string {
  return a1(h.sheetName, `${colLetter(colIndex(h, name))}${rowNumber}`);
}

/** 행 전체 범위 (헤더 폭 기준) */
export function rowRange(h: Headers, rowNumber: number): string {
  const last = colLetter(Math.max(0, h.names.length - 1));
  return a1(h.sheetName, `A${rowNumber}:${last}${rowNumber}`);
}

/** 헤더 순서에 맞춰 한 행을 구성 */
export function buildRow(h: Headers, values: Record<string, string | number>): string[] {
  const row = new Array<string>(h.names.length).fill("");
  for (const [name, value] of Object.entries(values)) {
    const i = h.index.get(name);
    if (i !== undefined) row[i] = String(value);
  }
  return row;
}
