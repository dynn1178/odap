import type { Config } from "tailwindcss";

/**
 * 색은 컴포넌트에서 직접 쓰지 않고 CSS 변수 토큰으로만 씁니다.
 * 실제 값은 src/app/globals.css 의 :root / .dark 에 정의되어 있습니다.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        surface2: token("surface-2"),
        line: token("border"),
        ink: token("text"),
        muted: token("muted"),
        brand: token("brand"),
        "brand-fg": token("brand-fg"),
        correct: token("correct"),
        wrong: token("wrong"),
        lucky: token("lucky"),
        lvl1: token("lvl1"),
        lvl2: token("lvl2"),
        lvl3: token("lvl3"),
        "dist-done": token("dist-done"),
        "dist-mid": token("dist-mid"),
        "dist-hot": token("dist-hot"),
      },
      fontFamily: {
        app: ["var(--font-app)"],
      },
      maxWidth: {
        app: "1100px",
      },
      keyframes: {
        knock: {
          "0%, 100%": { transform: "rotate(0deg) translateX(0)" },
          "20%": { transform: "rotate(-14deg) translateX(-2px)" },
          "40%": { transform: "rotate(10deg) translateX(2px)" },
          "60%": { transform: "rotate(-8deg) translateX(-1px)" },
          "80%": { transform: "rotate(5deg) translateX(1px)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        knock: "knock 420ms ease-in-out",
        "fade-up": "fade-up 180ms ease-out",
        "sheet-up": "sheet-up 220ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
