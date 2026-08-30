"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import { KnockLogo } from "@/components/KnockLogo";
import { kstDate, kstYearMonth, monthGrid } from "@/lib/util/date";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 출석 캘린더 — 학습한 날에 노크 마크가 찍힙니다 (기획안 2-5) */
export function AttendanceCalendar({ dates }: { dates: string[] }) {
  const initial = kstYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month0, setMonth0] = useState(initial.month0);

  const attended = new Set(dates);
  const { leading, days } = monthGrid(year, month0);
  const today = kstDate();

  const move = (delta: number) => {
    const m = month0 + delta;
    if (m < 0) {
      setYear(year - 1);
      setMonth0(11);
    } else if (m > 11) {
      setYear(year + 1);
      setMonth0(0);
    } else {
      setMonth0(m);
    }
  };

  const countThisMonth = days.filter((d) => attended.has(d)).length;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => move(-1)}
          className="h-11 w-11 rounded-lg text-muted hover:bg-surface2"
          aria-label="이전 달"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-sm font-bold">
            {year}년 {month0 + 1}월
          </div>
          <div className="text-[0.7rem] text-muted">{countThisMonth}일 학습</div>
        </div>
        <button
          type="button"
          onClick={() => move(1)}
          className="h-11 w-11 rounded-lg text-muted hover:bg-surface2"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[0.68rem] text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((date) => {
          const on = attended.has(date);
          const isToday = date === today;
          return (
            <div
              key={date}
              className={cx(
                "flex aspect-square flex-col items-center justify-center rounded-lg text-[0.7rem]",
                on ? "bg-brand/12 font-bold text-brand" : "text-muted",
                isToday && "ring-1 ring-brand",
              )}
              title={on ? `${date} 학습함` : date}
            >
              {on ? <KnockLogo size={16} /> : <span>{Number(date.slice(-2))}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
