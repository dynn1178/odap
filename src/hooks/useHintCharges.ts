"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/** 힌트 한 번이 다시 채워지기까지 */
export const HINT_RECHARGE_MS = 60_000;
/** 안 쓰고 모아둘 수 있는 최대 개수 — 무한정 쌓이면 "아껴 쓰기"가 의미를 잃습니다 */
export const MAX_HINT_CHARGES = 3;
/** 처음 들어온 사람에게 주는 개수 — 한 번은 바로 볼 수 있게 1개로 시작합니다 */
export const INITIAL_HINT_CHARGES = 1;

const STORAGE_KEY = "odap.hint";

/**
 * charges: 지금 쓸 수 있는 개수
 * since:   지금 채워지는 중인 한 개의 충전이 시작된 시각.
 *          가득 찼을 때는 의미가 없고, 처음 하나를 쓰는 순간부터 다시 셉니다.
 */
type HintState = { charges: number; since: number };

/**
 * 힌트 충전량은 과목·탭과 상관없이 한 사람 몫으로 하나입니다.
 * 과목마다 따로 두면 과목을 옮겨 다니며 무제한으로 볼 수 있습니다.
 */
function regen(state: HintState, now: number): HintState {
  if (state.charges >= MAX_HINT_CHARGES) return { charges: MAX_HINT_CHARGES, since: now };
  const gained = Math.floor((now - state.since) / HINT_RECHARGE_MS);
  if (gained <= 0) return state;

  const charges = Math.min(MAX_HINT_CHARGES, state.charges + gained);
  return {
    charges,
    // 가득 찼으면 타이머를 멈추고, 아니면 "쓰고 남은 시간"을 이어서 셉니다.
    since: charges >= MAX_HINT_CHARGES ? now : state.since + gained * HINT_RECHARGE_MS,
  };
}

function readState(): HintState {
  const now = Date.now();
  const fresh: HintState = { charges: INITIAL_HINT_CHARGES, since: now };
  if (typeof window === "undefined") return fresh;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as Partial<HintState>;
    const charges = Number(parsed.charges);
    const since = Number(parsed.since);
    if (!Number.isFinite(charges) || !Number.isFinite(since)) return fresh;
    return regen(
      {
        charges: Math.min(MAX_HINT_CHARGES, Math.max(0, Math.trunc(charges))),
        // 시계를 되돌려 놓은 브라우저에서 since 가 미래면 지금부터 다시 셉니다.
        since: Math.min(since, now),
      },
      now,
    );
  } catch {
    return fresh;
  }
}

function writeState(state: HintState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 저장 실패해도 이번 세션에서는 정상 동작합니다 */
  }
}

/**
 * 힌트 충전 (기능 요구 2).
 * 1분에 하나씩 차오르고, 최대 MAX_HINT_CHARGES 개까지 모입니다.
 * 새로고침해도 충전 시각이 유지되도록 localStorage 에 남깁니다.
 */
export function useHintCharges() {
  const [state, setState] = useState<HintState>(() => ({
    charges: INITIAL_HINT_CHARGES,
    since: 0,
  }));
  const [now, setNow] = useState(0);

  // 저장된 값은 마운트 뒤에 읽습니다 — 서버 렌더와 첫 렌더가 달라지지 않게 하기 위해서입니다.
  useEffect(() => {
    const loaded = readState();
    setState(loaded);
    setNow(Date.now());
    writeState(loaded);
  }, []);

  // 남은 시간을 1초마다 갱신하면서, 그 김에 충전도 반영합니다.
  useEffect(() => {
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((s) => {
        const next = regen(s, t);
        if (next.charges === s.charges && next.since === s.since) return s;
        writeState(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const spend = useCallback(() => {
    setState((s) => {
      const cur = regen(s, Date.now());
      if (cur.charges <= 0) return cur === s ? s : cur;
      // 가득 찬 상태에서 처음 하나를 쓰는 순간부터 충전 시간을 셉니다.
      const since = s.charges >= MAX_HINT_CHARGES ? Date.now() : cur.since;
      const next = { charges: cur.charges - 1, since };
      writeState(next);
      return next;
    });
  }, []);

  /** 다음 한 개가 채워지기까지 남은 밀리초 (가득 찼으면 0) */
  const remainingMs = useMemo(() => {
    if (state.charges >= MAX_HINT_CHARGES || now === 0) return 0;
    return Math.max(0, state.since + HINT_RECHARGE_MS - now);
  }, [state, now]);

  return { charges: state.charges, remainingMs, spend };
}

/** 남은 시간을 "2:07" 로 (0 이면 빈 문자열) */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
