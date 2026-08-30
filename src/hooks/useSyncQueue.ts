"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SyncEvent } from "@/lib/domain/types";

const STORAGE_KEY = "odap.queue";
/** 10문제마다 전송 (기획안 3-2 ②) */
const FLUSH_SIZE = 10;
/** 60초마다 전송 */
const FLUSH_INTERVAL_MS = 60_000;
const MAX_RETRY = 3;

function readBackup(): SyncEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBackup(events: SyncEvent[]) {
  try {
    if (events.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    /* 저장 실패해도 학습은 계속되어야 합니다 */
  }
}

/**
 * 답안을 모았다가 배치로 보냅니다.
 * 보내는 것은 "계산된 점수"가 아니라 "무엇을 눌렀는지"라서, 서버가 시트의
 * 현재 상태 위에 순서대로 적용합니다. 두 탭에서 동시에 풀어도 합쳐집니다.
 */
export function useSyncQueue() {
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
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "동기화에 실패했습니다.");
      retryRef.current = 0;
      setError(null);
      writeBackup(queueRef.current);
    } catch (e) {
      // 실패하면 큐 앞쪽에 되돌려 놓고 다음 기회에 재시도합니다.
      queueRef.current = [...batch, ...queueRef.current];
      writeBackup(queueRef.current);
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
  }, [sync]);

  const push = useCallback(
    (event: SyncEvent) => {
      queueRef.current.push(event);
      writeBackup(queueRef.current);
      sync();
      if (queueRef.current.length >= FLUSH_SIZE) void flush();
    },
    [flush, sync],
  );

  // 마운트 시: 지난번에 못 보낸 큐 복구
  useEffect(() => {
    const backup = readBackup();
    if (backup.length > 0) {
      queueRef.current = [...backup, ...queueRef.current];
      sync();
      void flush();
    }
  }, [flush, sync]);

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
        writeBackup([]);
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
  }, [flush, sync]);

  return { push, flush, pending, error };
}
