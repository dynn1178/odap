"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SETTINGS,
  FONT_SIZES,
  FONT_STACKS,
  FONT_WEBFONTS,
  normalizeSettings,
  resolveDark,
  SETTINGS_KEY,
  type Settings,
} from "@/lib/settings";

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  isDark: boolean;
};

const SettingsContext = createContext<Ctx | null>(null);

const WEBFONT_LINK_ID = "odap-webfont";

function applyWebfont(href: string | null) {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(WEBFONT_LINK_ID) as HTMLLinkElement | null;
  if (!href) {
    existing?.remove();
    return;
  }
  if (existing) {
    if (existing.href !== href) existing.href = href;
    return;
  }
  const link = document.createElement("link");
  link.id = WEBFONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [prefersDark, setPrefersDark] = useState(false);

  // 최초 1회: 저장된 설정 복원
  useEffect(() => {
    try {
      setSettings(normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}")));
    } catch {
      /* 저장값이 깨졌으면 기본값 사용 */
    }
  }, []);

  // 시스템 다크모드 변화 추적
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setPrefersDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const isDark = resolveDark(settings.theme, prefersDark);

  // 설정을 문서에 반영 + 저장
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", isDark);
    el.style.setProperty("--app-font-size", FONT_SIZES[settings.fontSize]);
    el.style.setProperty("--font-app", FONT_STACKS[settings.font]);
    applyWebfont(FONT_WEBFONTS[settings.font]);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* 사생활 보호 모드 등에서는 저장을 건너뜁니다 */
    }
  }, [settings, isDark]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => normalizeSettings({ ...prev, ...patch }));
  }, []);

  const value = useMemo(() => ({ settings, update, isDark }), [settings, update, isDark]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("SettingsProvider 안에서만 useSettings 를 쓸 수 있습니다.");
  return ctx;
}
