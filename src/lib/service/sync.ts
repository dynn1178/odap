import "server-only";
import {
  applyAnswer,
  CELL_LIMIT,
  countLevels,
  isNearCellLimit,
  serializeLevels,
  serializeProgress,
} from "@/lib/domain/progress";
import { isAnswerKind, isCorrectKind, type ProgressMap, type SyncEvent } from "@/lib/domain/types";
import {
  appendProgressRows,
  buildProgressWrites,
  indexRows,
  keyColumnRanges,
  readProgressCells,
  type ProgressWrite,
} from "@/lib/repo/progress";
import { appendDailyRows, buildDailyWrites, dailyKey, type DailyDelta } from "@/lib/repo/stats";
import { a1, batchGetValues, batchUpdateValues } from "@/lib/sheets/client";
import { SHEET } from "@/lib/sheets/schema";
import { Table } from "@/lib/sheets/table";
import { kstDate } from "@/lib/util/date";

/** 문제 1개에 인정하는 최대 학습 시간 (자리 비움 방지) */
export const MAX_SECONDS_PER_QUESTION = 120;
/** 한 번의 배치로 받을 수 있는 최대 이벤트 수 */
export const MAX_EVENTS_PER_BATCH = 500;

export type SyncResult = {
  applied: number;
  skipped: number;
  warnings: string[];
};

function sanitize(raw: unknown): SyncEvent[] {
  if (!Array.isArray(raw)) return [];
  const today = kstDate();
  const out: SyncEvent[] = [];

  for (const e of raw.slice(0, MAX_EVENTS_PER_BATCH)) {
    if (!e || typeof e !== "object") continue;
    const ev = e as Record<string, unknown>;
    const subjectCode = String(ev.subjectCode ?? "").trim();
    const questionId = String(ev.questionId ?? "").trim();
    const kind = ev.kind;
    if (!subjectCode || !questionId || !isAnswerKind(kind)) continue;
    if (questionId.includes(":") || questionId.includes("|")) continue;

    const rawSeconds = Number(ev.seconds);
    const seconds = Number.isFinite(rawSeconds)
      ? Math.min(MAX_SECONDS_PER_QUESTION, Math.max(0, Math.round(rawSeconds)))
      : 0;

    // 클라이언트 시각은 참고만 합니다. 서버 오늘 날짜에서 크게 벗어나면 오늘로 보정합니다.
    const at = typeof ev.at === "string" ? ev.at : "";
    let date = at ? kstDate(at) : today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Math.abs(dayDiff(date, today)) > 2) date = today;

    out.push({ subjectCode, questionId, kind, seconds, at: date });
  }
  return out;
}

function dayDiff(a: string, b: string): number {
  return (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

/**
 * 배치 동기화 (기획안 3-2 ②).
 *
 * 클라이언트는 "계산된 점수"가 아니라 "무엇을 눌렀는지"를 보냅니다.
 * 서버가 시트의 현재 상태를 읽어 그 위에 이벤트를 순서대로 적용하므로,
 * 두 탭에서 동시에 풀어도 결과가 덮어써지지 않고 합쳐집니다.
 *
 * API 호출: 읽기 2회 + 쓰기 1회 (+ 신규 행이 있을 때만 append)
 */
export async function applyBatch(userId: string, rawEvents: unknown): Promise<SyncResult> {
  const events = sanitize(rawEvents);
  const skipped = Array.isArray(rawEvents) ? rawEvents.length - events.length : 0;
  if (events.length === 0) return { applied: 0, skipped, warnings: [] };

  // ── 읽기 1회: 진도 키 컬럼 + 일별통계 전체 ──
  const [uRange, sRange] = await keyColumnRanges();
  const [userCol, subjectCol, dailyGrid] = await batchGetValues([
    uRange,
    sRange,
    a1(SHEET.dailyStats),
  ]);

  const rowMap = indexRows(userCol, subjectCol, userId);
  const subjects = [...new Set(events.map((e) => e.subjectCode))];

  // ── 읽기 1회: 해당 과목들의 진도 셀만 ──
  const existing = await readProgressCells(
    subjects
      .filter((code) => rowMap.has(code))
      .map((code) => ({ subjectCode: code, rowNumber: rowMap.get(code)! })),
  );

  const state = new Map<string, ProgressMap>();
  for (const code of subjects) state.set(code, existing.get(code) ?? {});

  const daily = new Map<string, DailyDelta>();
  const warnings: string[] = [];

  for (const ev of events) {
    const map = state.get(ev.subjectCode)!;
    map[ev.questionId] = applyAnswer(map[ev.questionId], ev.kind);

    const key = dailyKey(ev.at, ev.subjectCode);
    const d = daily.get(key) ?? { solved: 0, correct: 0, wrong: 0, seconds: 0 };
    d.solved += 1;
    if (isCorrectKind(ev.kind)) d.correct += 1;
    else d.wrong += 1;
    d.seconds += ev.seconds;
    daily.set(key, d);
  }

  const writes: ProgressWrite[] = subjects.map((code) => ({
    subjectCode: code,
    rowNumber: rowMap.get(code) ?? null,
    progress: state.get(code)!,
  }));

  for (const w of writes) {
    const serialized = serializeProgress(w.progress);
    if (isNearCellLimit(serialized)) {
      warnings.push(
        `과목 "${w.subjectCode}" 의 진도 데이터가 ${serialized.length}자로 셀 한도(${CELL_LIMIT}자)에 근접했습니다. 기획안 3-4에 따라 과목을 분할해 주세요.`,
      );
    }
  }

  // 오늘 행에만 난이도 스냅샷을 남깁니다. 이벤트를 적용한 뒤의 상태라 추가 읽기가 없습니다.
  // (지난 날짜로 보정된 이벤트에 오늘 상태를 덮어쓰면 그날 스냅샷이 틀어지므로 오늘만 씁니다.)
  const today = kstDate();
  const levelSnapshots = new Map<string, string>();
  for (const code of subjects) {
    levelSnapshots.set(dailyKey(today, code), serializeLevels(countLevels(state.get(code)!)));
  }

  const dailyTable = new Table(SHEET.dailyStats, dailyGrid);
  const progressWrites = await buildProgressWrites(userId, writes);
  const dailyWrites = buildDailyWrites(dailyTable, userId, daily, levelSnapshots);

  // ── 쓰기 1회: 진도 + 일별통계를 한 번에 ──
  await batchUpdateValues([...progressWrites.updates, ...dailyWrites.updates]);
  await appendProgressRows(progressWrites.appends);
  await appendDailyRows(dailyWrites.appends);

  return { applied: events.length, skipped, warnings };
}
