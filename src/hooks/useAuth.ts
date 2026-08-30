"use client";

import { useEffect, useState } from "react";

export type Me = { userId: string; name: string } | null;

let cache: Promise<Me> | null = null;

async function fetchMe(): Promise<Me> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: Me };
  return data.user ?? null;
}

export function loadMe(force = false): Promise<Me> {
  if (force || !cache) cache = fetchMe();
  return cache;
}

export function clearMeCache() {
  cache = null;
}

/** 로그인 상태. loading 중에는 화면을 비워 두고 깜빡임을 피합니다. */
export function useAuth() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadMe().then((user) => {
      if (!alive) return;
      setMe(user);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { me, loading };
}
