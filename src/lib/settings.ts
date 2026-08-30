/** 화면 설정 (기획안 6-2, 6-3). 값은 브라우저 localStorage 에만 저장됩니다. */

export const SETTINGS_KEY = "odap.settings";

export type ThemeChoice = "light" | "dark" | "system";
export type FontSizeChoice = "sm" | "md" | "lg" | "xl";
export type FontChoice = "gothic" | "serif" | "system";

export type Settings = {
  theme: ThemeChoice;
  fontSize: FontSizeChoice;
  font: FontChoice;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  fontSize: "md",
  font: "gothic",
};

export const FONT_SIZES: Record<FontSizeChoice, string> = {
  sm: "15px",
  md: "17px",
  lg: "19px",
  xl: "21px",
};

export const FONT_SIZE_LABELS: Record<FontSizeChoice, string> = {
  sm: "작게",
  md: "보통",
  lg: "크게",
  xl: "아주 크게",
};

const SYSTEM_SANS =
  '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", system-ui, sans-serif';

export const FONT_STACKS: Record<FontChoice, string> = {
  gothic: `"Pretendard Variable", Pretendard, ${SYSTEM_SANS}`,
  serif: `"Nanum Myeongjo", "Batang", "바탕", "AppleMyungjo", Georgia, serif`,
  system: SYSTEM_SANS,
};

export const FONT_LABELS: Record<FontChoice, string> = {
  gothic: "고딕",
  serif: "명조",
  system: "시스템 기본",
};

/** "시스템 기본"을 고르면 웹폰트를 아예 받지 않습니다 (저사양 기기 배려). */
export const FONT_WEBFONTS: Record<FontChoice, string | null> = {
  gothic:
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
  serif: "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap",
  system: null,
};

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "라이트",
  dark: "다크",
  system: "시스템 따름",
};

export function normalizeSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  return {
    theme: s.theme && s.theme in THEME_LABELS ? s.theme : DEFAULT_SETTINGS.theme,
    fontSize: s.fontSize && s.fontSize in FONT_SIZES ? s.fontSize : DEFAULT_SETTINGS.fontSize,
    font: s.font && s.font in FONT_STACKS ? s.font : DEFAULT_SETTINGS.font,
  };
}

export function resolveDark(theme: ThemeChoice, prefersDark: boolean): boolean {
  return theme === "dark" || (theme === "system" && prefersDark);
}

/**
 * 첫 페인트 전에 실행되는 인라인 스크립트.
 * 다크 모드에서 흰 화면이 번쩍이는 것을 막습니다 (기획안 6-2).
 */
export function themeBootstrapScript(): string {
  return `(function(){try{
var d=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_KEY)})||"{}");
var sizes=${JSON.stringify(FONT_SIZES)};
var fonts=${JSON.stringify(FONT_STACKS)};
var theme=d.theme||${JSON.stringify(DEFAULT_SETTINGS.theme)};
var dark=theme==="dark"||(theme==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var el=document.documentElement;
el.classList.toggle("dark",dark);
el.style.setProperty("--app-font-size",sizes[d.fontSize]||sizes[${JSON.stringify(DEFAULT_SETTINGS.fontSize)}]);
el.style.setProperty("--font-app",fonts[d.font]||fonts[${JSON.stringify(DEFAULT_SETTINGS.font)}]);
}catch(e){}})();`;
}
