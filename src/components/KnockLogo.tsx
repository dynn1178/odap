/**
 * 오답노크 로고 — 문 + 문고리(door knocker) + 노크 소리 파장.
 * "두드리면 열릴지어다" 를 그림 하나로 줄인 것이라,
 * 브랜드 마크부터 그 의미를 담습니다.
 */
export function KnockLogo({
  size = 28,
  className = "",
  knocking = false,
}: {
  size?: number;
  className?: string;
  knocking?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={knocking ? "origin-center animate-knock" : undefined}
      >
        {/* 문 */}
        <path d="M11 29V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v22" />
        <path d="M9 29h20" />
        {/* 문고리 고리 */}
        <circle cx="22" cy="18" r="2.4" />
        <path d="M22 15.6v-1.4" />
      </g>
      {/* 노크 소리 파장 */}
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55">
        <path d="M6 12.5 3.5 11" />
        <path d="M6 16h-2.6" />
        <path d="M6 19.5 3.5 21" />
      </g>
    </svg>
  );
}

/** 로고 + 워드마크 */
export function KnockWordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-brand">
      <KnockLogo size={size} />
      <span className="text-[1.05rem] font-bold tracking-tight text-ink">오답노크</span>
    </span>
  );
}

/** 오답 화면에서 문을 두드리는 마이크로 인터랙션 */
export function KnockingDoor({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-brand" aria-hidden="true">
      <KnockLogo size={size} knocking />
    </span>
  );
}
