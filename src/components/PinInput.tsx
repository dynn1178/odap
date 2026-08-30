"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";

/** 방금 누른 숫자를 보여줄 시간 */
const REVEAL_MS = 800;

/**
 * 번호 4자리 입력.
 *
 * 방금 누른 숫자만 잠깐 보이고 나머지는 * 로 가립니다.
 * 진짜 <input> 을 투명하게 겹쳐 두어 모바일 키보드·붙여넣기·자동완성은 그대로 동작하고,
 * 눈에 보이는 칸은 그 값을 따라 그리기만 합니다.
 */
export function PinInput({
  value,
  onChange,
  length = 4,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  autoComplete?: string;
  id?: string;
}) {
  const [reveal, setReveal] = useState(-1);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLength = useRef(value.length);

  useEffect(() => {
    // 지웠을 때는 아무것도 보여주지 않습니다.
    if (value.length > prevLength.current) {
      setReveal(value.length - 1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setReveal(-1), REVEAL_MS);
    } else {
      setReveal(-1);
    }
    prevLength.current = value.length;
  }, [value]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setReveal(-1);
        }}
        inputMode="numeric"
        pattern={`\\d{${length}}`}
        maxLength={length}
        autoComplete={autoComplete}
        aria-label={`번호 ${length}자리`}
        required
        /* 글자는 투명하게 두고 아래 칸이 대신 보여 줍니다 */
        className="absolute inset-0 h-full w-full rounded-xl border border-transparent bg-transparent px-4 text-transparent caret-transparent outline-none"
      />
      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none flex gap-2 rounded-xl border bg-surface p-1.5 transition",
          focused ? "border-brand" : "border-line",
        )}
      >
        {Array.from({ length }, (_, i) => {
          const filled = i < value.length;
          const isCaret = focused && i === value.length;
          return (
            <div
              key={i}
              className={cx(
                "flex h-11 flex-1 items-center justify-center rounded-lg text-lg font-bold tabular-nums transition",
                filled ? "bg-surface2 text-ink" : "bg-surface2/60 text-muted",
                isCaret && "ring-2 ring-inset ring-brand",
              )}
            >
              {filled ? (i === reveal ? value[i] : "*") : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
