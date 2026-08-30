/** 모든 날짜 집계는 Asia/Seoul 기준입니다 (기획안 4-5). */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** YYYY-MM-DD (KST) */
export function kstDate(input: Date | string | number = Date.now()): string {
  const d = input instanceof Date ? input : new Date(input);
  const t = d.getTime();
  if (!Number.isFinite(t)) return kstDate(Date.now());
  return new Date(t + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** "2026-08-30" → "8월 30일" */
export function formatKoreanDay(date: string): string {
  const [, m, d] = date.split("-");
  if (!m || !d) return date;
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 초 → "1시간 23분" / "5분 12초" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${sec}초`;
  return `${sec}초`;
}

/** 해당 달의 날짜 배열과 시작 요일 (출석 캘린더용) */
export function monthGrid(year: number, monthIndex0: number) {
  const first = new Date(Date.UTC(year, monthIndex0, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const leading = first.getUTCDay();
  const days: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(
      `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  return { leading, days };
}

/** 오늘(KST)의 연/월 */
export function kstYearMonth(): { year: number; month0: number } {
  const [y, m] = kstDate().split("-").map(Number);
  return { year: y, month0: m - 1 };
}
