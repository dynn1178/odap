"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useSettings } from "@/components/SettingsProvider";
import { btn, Card, cx, Section } from "@/components/ui";
import { clearMeCache, useAuth } from "@/hooks/useAuth";
import { flushBeforeLogout } from "@/hooks/useSyncQueue";
import {
  FONT_LABELS,
  FONT_SIZE_LABELS,
  FONT_SIZES,
  FONT_STACKS,
  THEME_LABELS,
  type FontChoice,
  type FontSizeChoice,
  type ThemeChoice,
} from "@/lib/settings";

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const { me } = useAuth();
  const router = useRouter();

  /** 설정은 고르는 즉시 저장되므로, 버튼은 "저장"이 아니라 "돌아가기"입니다.
   *  주소창으로 바로 들어와 뒤로 갈 곳이 없으면 과목 선택으로 보냅니다. */
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <button
          type="button"
          onClick={goBack}
          className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm text-muted hover:text-ink"
        >
          <span aria-hidden="true">←</span> 돌아가기
        </button>

        <Section title="화면 설정" hint="고르면 바로 저장됩니다 · 이 기기에만 적용">
          <div className="space-y-5">
            <Choice
              label="테마"
              options={Object.keys(THEME_LABELS) as ThemeChoice[]}
              current={settings.theme}
              render={(v) => THEME_LABELS[v]}
              onSelect={(theme) => update({ theme })}
            />

            <Choice
              label="글자 크기"
              options={Object.keys(FONT_SIZES) as FontSizeChoice[]}
              current={settings.fontSize}
              render={(v) => FONT_SIZE_LABELS[v]}
              onSelect={(fontSize) => update({ fontSize })}
            />

            <Choice
              label="폰트"
              options={Object.keys(FONT_STACKS) as FontChoice[]}
              current={settings.font}
              render={(v) => FONT_LABELS[v]}
              onSelect={(font) => update({ font })}
              hint="시스템 기본을 고르면 웹폰트를 받지 않아 더 가볍습니다."
            />
          </div>
        </Section>

        <Section title="미리보기">
          <Card>
            <p className="text-[0.72rem] text-muted">문제 예시</p>
            <p className="mt-1.5 text-[1.15rem] font-semibold leading-relaxed">
              다음 중 &lsquo;노크&rsquo;의 뜻으로 알맞은 것은?
            </p>
            <ul className="mt-3 space-y-2 text-[0.98rem]">
              <li className="rounded-xl border border-correct bg-correct/10 px-4 py-3 text-correct">
                ○ 문을 두드리다
              </li>
              <li className="rounded-xl border border-line px-4 py-3">문을 열다</li>
            </ul>
          </Card>
        </Section>

        {me && (
          <Section title="계정" hint={`${me.name} 님으로 로그인 중`}>
            <button
              type="button"
              className={btn.ghost}
              onClick={async () => {
                // 세션이 살아 있을 때 남은 답안을 먼저 보냅니다.
                await flushBeforeLogout(me.userId);
                await fetch("/api/auth/logout", { method: "POST" });
                clearMeCache();
                router.replace("/login");
              }}
            >
              로그아웃
            </button>
          </Section>
        )}

        <div className="sticky bottom-0 -mx-3 border-t border-line bg-bg/90 px-3 pb-3 pt-3 backdrop-blur safe-bottom sm:-mx-4 sm:px-4">
          <button type="button" onClick={goBack} className={cx(btn.primary, "w-full")}>
            확인
          </button>
        </div>

        <p className="pb-2 text-center text-xs leading-relaxed text-muted">
          두드리면 열릴지어다.
          <br />
          오답 두드리기, 오답노크.
        </p>
      </div>
    </AppShell>
  );
}

function Choice<T extends string>({
  label,
  hint,
  options,
  current,
  render,
  onSelect,
}: {
  label: string;
  hint?: string;
  options: T[];
  current: T;
  render: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  return (
    <div>
      <div className="mb-2">
        <span className="text-sm font-semibold">{label}</span>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onSelect(o)}
            aria-pressed={current === o}
            className={cx(
              "min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-medium transition",
              current === o
                ? "border-brand bg-brand/10 font-bold text-brand"
                : "border-line bg-surface text-ink hover:bg-surface2",
            )}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
