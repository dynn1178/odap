"use client";

import { useCallback, useEffect, useRef } from "react";

/** 문제 1개에 인정하는 최대 시간 (자리 비움 방지) */
const MAX_SECONDS = 120;

/**
 * 문제 노출 ~ 응답까지의 시간을 잽니다.
 * 탭이 백그라운드로 가면 타이머를 멈춰서, 자리를 비운 시간이 학습시간에 섞이지 않게 합니다.
 */
export function useQuestionTimer() {
  const startedAt = useRef<number | null>(null);
  const accumulated = useRef(0);

  const reset = useCallback(() => {
    accumulated.current = 0;
    startedAt.current = document.visibilityState === "visible" ? Date.now() : null;
  }, []);

  const stop = useCallback((): number => {
    if (startedAt.current !== null) {
      accumulated.current += Date.now() - startedAt.current;
      startedAt.current = null;
    }
    return Math.min(MAX_SECONDS, Math.round(accumulated.current / 1000));
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === "hidden") {
        if (startedAt.current !== null) {
          accumulated.current += Date.now() - startedAt.current;
          startedAt.current = null;
        }
      } else if (startedAt.current === null) {
        startedAt.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return { reset, stop };
}
