import "server-only";
import { a1, appendValues, colLetter, getValues, updateValues, type Grid } from "./client";

/**
 * 헤더(1행) 텍스트로 열을 찾는 시트 접근 래퍼.
 * 열 순서가 바뀌거나 메모용 열이 추가돼도 앱이 깨지지 않도록 하는 층입니다.
 */
export class Table {
  readonly sheetName: string;
  readonly headers: string[];
  readonly rows: Grid;
  private readonly colIndex: Map<string, number>;

  constructor(sheetName: string, grid: Grid) {
    this.sheetName = sheetName;
    const [header = [], ...body] = grid;
    this.headers = header.map((h) => (h ?? "").trim());
    this.rows = body;
    this.colIndex = new Map();
    this.headers.forEach((h, i) => {
      if (h && !this.colIndex.has(h)) this.colIndex.set(h, i);
    });
  }

  static async load(sheetName: string): Promise<Table> {
    const grid = await getValues(a1(sheetName));
    return new Table(sheetName, grid);
  }

  hasColumn(name: string): boolean {
    return this.colIndex.has(name);
  }

  /** 헤더가 없으면 명확한 한글 오류로 알려줍니다. */
  col(name: string): number {
    const i = this.colIndex.get(name);
    if (i === undefined) {
      throw new Error(
        `시트 "${this.sheetName}" 의 1행에 "${name}" 컬럼이 없습니다. 헤더를 확인해 주세요. (현재 헤더: ${this.headers.join(", ") || "없음"})`,
      );
    }
    return i;
  }

  /** 없는 컬럼이면 빈 문자열 — 선택 컬럼(설명/해설 등)에 사용 */
  opt(row: Grid[number], name: string): string {
    const i = this.colIndex.get(name);
    if (i === undefined) return "";
    return (row[i] ?? "").trim();
  }

  get(row: Grid[number], name: string): string {
    return (row[this.col(name)] ?? "").trim();
  }

  /** rows 배열의 0-based 인덱스 → 시트의 1-based 행 번호 (헤더가 1행) */
  rowNumber(rowIndex: number): number {
    return rowIndex + 2;
  }

  /** 특정 행의 특정 컬럼들을 갱신하기 위한 A1 range 목록을 만듭니다. */
  cellRange(rowIndex: number, name: string): string {
    return a1(this.sheetName, `${colLetter(this.col(name))}${this.rowNumber(rowIndex)}`);
  }

  /** 헤더 순서대로 값을 채운 한 행을 만듭니다. */
  buildRow(values: Record<string, string | number>): string[] {
    const row = new Array<string>(this.headers.length).fill("");
    for (const [name, value] of Object.entries(values)) {
      const i = this.colIndex.get(name);
      if (i !== undefined) row[i] = String(value);
    }
    return row;
  }

  async appendRow(values: Record<string, string | number>): Promise<void> {
    await appendValues(a1(this.sheetName, "A1"), [this.buildRow(values)]);
  }

  /** 한 행 전체를 덮어씁니다 (부분 갱신보다 호출 수가 적습니다). */
  async writeRow(rowIndex: number, values: Record<string, string | number>): Promise<void> {
    const row = this.buildRow(values);
    const lastCol = colLetter(Math.max(0, this.headers.length - 1));
    const n = this.rowNumber(rowIndex);
    await updateValues(a1(this.sheetName, `A${n}:${lastCol}${n}`), [row]);
  }

  /** 행 전체를 덮어쓰는 batchUpdate 용 range/values 쌍을 만듭니다. */
  rowUpdate(rowIndex: number, values: Record<string, string | number>) {
    const lastCol = colLetter(Math.max(0, this.headers.length - 1));
    const n = this.rowNumber(rowIndex);
    return {
      range: a1(this.sheetName, `A${n}:${lastCol}${n}`),
      values: [this.buildRow(values)],
    };
  }

  findIndex(predicate: (row: Grid[number]) => boolean): number {
    return this.rows.findIndex(predicate);
  }
}
