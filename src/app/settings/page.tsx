"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useSettings } from "@/components/SettingsProvider";
import { btn, Card, cx, Section } from "@/components/ui";
import { clearMeCache, useAuth } from "@/hooks/useAuth";
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

  return (
    <AppShell>
      <div className="space-y-8">
        <Section title="화면 설정" hint="이 기기에만 저장됩니다">
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
                await fetch("/api/auth/logout", { method: "POST" });
                clearMeCache();
                router.replace("/login");
              }}
            >
              로그아웃
            </button>
          </Section>
        )}

        <p className="pb-4 text-center text-xs leading-relaxed text-muted">
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
