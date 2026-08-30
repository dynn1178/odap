"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SyncEvent } from "@/lib/domain/types";

const STORAGE_KEY = "odap.queue";
/** 10문제마다 전송 (기획안 3-2 ②) */
const FLUSH_SIZE = 10;
/** 60초마다 전송 */
const FLUSH_INTERVAL_MS = 60_000;
const MAX_RETRY = 3;

/**
 * 백업에 "누구 것인지"를 같이 적습니다.
 * 한 브라우저를 여러 사람이 쓸 때, 못 보낸 답안이 다음 사람 기록으로 올라가면 안 됩니다.
 */
type Backup = { userId: string; events: SyncEvent[] };

function readBackup(userId: string): SyncEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Backup | SyncEvent[];
    // 주인이 적혀 있지 않은 옛 형식은 누구 것인지 알 수 없어 버립니다.
    if (Array.isArray(parsed)) return [];
    if (!parsed || parsed.userId !== userId) return [];
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

function writeBackup(userId: string, events: SyncEvent[]) {
  try {
    if (events.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, events } satisfies Backup));
  } catch {
    /* 저장 실패해도 학습은 계속되어야 합니다 */
  }
}

async function postEvents(events: SyncEvent[]): Promise<void> {
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
    keepalive: true,
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "동기화에 실패했습니다.");
}

/**
 * 로그아웃 직전에 부릅니다 — 남은 답안을 마저 보내고 백업을 비웁니다.
 * 세션 쿠키가 아직 살아 있을 때 보내야 하므로 반드시 로그아웃 요청보다 먼저 실행합니다.
 * 보내지 못하면 백업을 그대로 두어, 그 사람이 다시 로그인할 때 이어서 올라갑니다.
 */
export async function flushBeforeLogout(userId: string): Promise<boolean> {
  const events = readBackup(userId);
  if (events.length === 0) return true;
  try {
    await postEvents(events);
    writeBackup(userId, []);
    return true;
  } catch {
    return false;
  }
}

/**
 * 답안을 모았다가 배치로 보냅니다.
 * 보내는 것은 "계산된 점수"가 아니라 "무엇을 눌렀는지"라서, 서버가 시트의
 * 현재 상태 위에 순서대로 적용합니다. 두 탭에서 동시에 풀어도 합쳐집니다.
 */
export function useSyncQueue(userId: string) {
  const queueRef = useRef<SyncEvent[]>([]);
  const sendingRef = useRef(false);
  const retryRef = useRef(0);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(() => setPending(queueRef.current.length), []);

  const flush = useCallback(async (): Promise<void> => {
    if (sendingRef.current) return;
    const batch = queueRef.current;
    if (batch.length === 0) return;

    sendingRef.current = true;
    queueRef.current = [];
    sync();

    try {
      await postEvents(batch);
      retryRef.current = 0;
      setError(null);
      writeBackup(userId, queueRef.current);
    } catch (e) {
      // 실패하면 큐 앞쪽에 되돌려 놓고 다음 기회에 재시도합니다.
      queueRef.current = [...batch, ...queueRef.current];
      writeBackup(userId, queueRef.current);
      retryRef.current += 1;
      if (retryRef.current >= MAX_RETRY) {
        setError(
          e instanceof Error
            ? `기록 저장이 지연되고 있어요: ${e.message}`
            : "기록 저장이 지연되고 있어요.",
        );
      }
      sync();
    } finally {
      sendingRef.current = false;
      sync();
    }
  }, [sync, userId]);

  const push = useCallback(
    (event: SyncEvent) => {
      queueRef.current.push(event);
      writeBackup(userId, queueRef.current);
      sync();
      if (queueRef.current.length >= FLUSH_SIZE) void flush();
    },
    [flush, sync, userId],
  );

  // 마운트 시: 지난번에 못 보낸 큐 복구
  useEffect(() => {
    const backup = readBackup(userId);
    if (backup.length > 0) {
      queueRef.current = [...backup, ...queueRef.current];
      sync();
      void flush();
    }
  }, [flush, sync, userId]);

  // 60초마다 + 탭 이탈/종료 시 전송
  useEffect(() => {
    const timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      const batch = queueRef.current;
      if (batch.length === 0) return;
      // 탭이 닫히는 중에도 확실히 보내기 위해 sendBeacon 사용
      const blob = new Blob([JSON.stringify({ events: batch })], { type: "application/json" });
      if (navigator.sendBeacon("/api/sync", blob)) {
        queueRef.current = [];
        writeBackup(userId, []);
        sync();
      } else {
        void flush();
      }
    };

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onHidden);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
      void flush();
    };
  }, [flush, sync, userId]);

  return { push, flush, pending, error };
}
