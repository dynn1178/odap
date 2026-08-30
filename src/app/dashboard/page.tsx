"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ACCURACY_MIN_SOLVED,
  type DashboardData,
  type InsightData,
  type RankingMetric,
  type RankingRow,
  type ReviewRow,
} from "@/lib/domain/view-types";
import { AppShell } from "@/components/AppShell";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import {
  DailyTable,
  DeltaStat,
  LevelBar,
  LevelTrendChart,
  METRICS,
  type MetricKey,
  TrendChart,
} from "@/components/charts";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { QuestionDetail } from "@/components/QuestionDetail";
import { btn, Card, cx, Empty, ErrorBox, Section, Spinner, Stat } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { formatDuration } from "@/lib/util/date";

type DashboardResponse = DashboardData & {
  subject: { code: string; name: string };
  me: { userId: string; name: string };
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const router = useRouter();
  const params = useSearchParams();
  const subjectCode = params.get("subject") ?? "";
  const { me, loading: authLoading } = useAuth();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !me) router.replace("/login");
  }, [authLoading, me, router]);

  const load = useCallback(() => {
    if (!subjectCode) return;
    setError(null);
    const q = encodeURIComponent(subjectCode);
    Promise.all([
      fetch(`/api/dashboard?subject=${q}`, { cache: "no-store" }).then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? "대시보드를 불러오지 못했습니다.");
        return b as DashboardResponse;
      }),
      fetch(`/api/insights?subject=${q}`, { cache: "no-store" }).then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? "학습 인사이트를 불러오지 못했습니다.");
        return b as InsightData;
      }),
    ])
      .then(([d, iv]) => {
        setData(d);
        setInsight(iv);
      })
      .catch((e: Error) => setError(e.message));
  }, [subjectCode]);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  if (authLoading || !me) return null;

  if (!subjectCode) {
    return (
      <AppShell>
        <Empty>
          대시보드는 과목 안에서 볼 수 있어요.{" "}
          <Link href="/" className="text-brand underline">
            과목 선택으로 가기
          </Link>
        </Empty>
      </AppShell>
    );
  }

  const subject = data?.subject;

  return (
    <AppShell subject={subject}>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!error && !data && <Spinner label="대시보드를 불러오는 중" />}

      {data && insight && (
        <div className="space-y-8">
          <Section title="오늘 성적" hint={`${data.date} · ${data.subject.name}`}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <Stat label="푼 문제" value={data.today.solved} suffix="문제" />
              <Stat label="정답률" value={data.today.accuracy} suffix="%" tone="brand" />
              <Stat label="맞음" value={data.today.correct} tone="correct" />
              <Stat label="틀림" value={data.today.wrong} tone="wrong" />
              <Stat label="학습시간" value={formatDuration(data.today.seconds)} />
            </div>
          </Section>

          <Section title="전체 누적 성적" hint="이 과목에서 지금까지 쌓은 기록">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <Stat label="푼 문제" value={data.total.solved} suffix="문제" />
              <Stat label="정답률" value={data.total.accuracy} suffix="%" tone="brand" />
              <Stat label="맞음" value={data.total.correct} tone="correct" />
              <Stat label="틀림" value={data.total.wrong} tone="wrong" />
              <Stat label="학습시간" value={formatDuration(data.total.seconds)} />
            </div>
          </Section>

          <Section
            title="나아지고 있나요?"
            hint={`최근 ${data.trend.days}일과 그 직전 ${data.trend.days}일 비교`}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <DeltaStat
                label="정답률"
                value={data.trend.accuracy.recent}
                unit="%"
                delta={data.trend.accuracy.delta}
                hasPrev={data.trend.accuracy.hasPrev}
              />
              <DeltaStat
                label="하루 평균 학습시간"
                value={data.trend.minutesPerDay.recent}
                unit="분"
                delta={data.trend.minutesPerDay.delta}
                hasPrev={data.trend.minutesPerDay.hasPrev}
              />
              <DeltaStat
                label="하루 평균 푼 문제"
                value={data.trend.solvedPerDay.recent}
                unit="문제"
                delta={data.trend.solvedPerDay.delta}
                hasPrev={data.trend.solvedPerDay.hasPrev}
              />
            </div>
          </Section>

          <TrendSection points={data.daily} />

          <LevelSection insight={insight} points={data.daily} subjectCode={subjectCode} />

          <Section title="출석" hint={`이 과목을 공부한 날 ${data.attendance.length}일`}>
            <AttendanceCalendar dates={data.attendance} />
          </Section>

          <Section title="랭킹" hint="이 과목을 함께 공부하는 사람들 · 지표를 골라 보세요">
            <Ranking rows={data.ranking} />
          </Section>

          <Section title="방문자" hint="이 과목 기준">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="오늘 공부한 사람" value={data.visitors.today} suffix="명" />
              <Stat label="이 과목 학습자" value={data.visitors.totalLearners} suffix="명" />
            </div>
          </Section>

          <Section title="한줄 남기기" hint="이 과목을 함께 공부하는 사람들에게">
            <Comments subjectCode={subjectCode} initial={data.comments} />
          </Section>
        </div>
      )}
    </AppShell>
  );
}

/** 날짜별 추이 — 지표를 하나씩 바꿔 가며 봅니다 (축이 다른 둘을 겹치지 않습니다). */
function TrendSection({ points }: { points: DashboardData["daily"] }) {
  const [metric, setMetric] = useState<MetricKey>("accuracy");

  return (
    <Section title="날짜별 추이" hint="공부한 날만 표시됩니다">
      {points.length === 0 ? (
        <Empty>아직 기록이 없어요. 한 문제라도 풀면 여기에 쌓입니다.</Empty>
      ) : (
        <Card>
          <div className="mb-1 flex gap-1 rounded-xl bg-surface2 p-1">
            {(Object.keys(METRICS) as MetricKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setMetric(k)}
                className={cx(
                  "flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition",
                  metric === k ? "bg-surface text-ink shadow-sm" : "text-muted",
                )}
              >
                {METRICS[k].label}
              </button>
            ))}
          </div>
          <TrendChart points={points} metric={metric} />
          <DailyTable points={points} />
        </Card>
      )}
    </Section>
  );
}

/** 난이도 분포 — 문제 1,000개를 나열하는 대신 세 구간으로 접어 봅니다. */
function LevelSection({
  insight,
  points,
  subjectCode,
}: {
  insight: InsightData;
  points: DashboardData["daily"];
  subjectCode: string;
}) {
  const [selected, setSelected] = useState<ReviewRow | null>(null);
  const { counts, unseen, attempted, total } = insight.levels;
  const hasHistory = points.some((p) => p.levels);

  return (
    <Section
      title="난이도 분포"
      hint={`${total}문제 중 ${attempted}문제를 풀어봤어요`}
    >
      <div className="space-y-4">
        <Card>
          {attempted === 0 && unseen === 0 ? (
            <Empty>등록된 문제가 없어요.</Empty>
          ) : (
            <LevelBar counts={counts} unseen={unseen} />
          )}
        </Card>

        <Card>
          <p className="mb-1 text-sm font-semibold">날짜별 변화</p>
          {hasHistory ? (
            <>
              <p className="mb-2 text-xs text-muted">
                초록(마스터)이 자라고 빨강(노크 중)이 줄면 잘 되고 있는 거예요.
              </p>
              <LevelTrendChart points={points} />
            </>
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              난이도 변화는 오늘부터 하루에 한 번씩 기록됩니다.
              <br />
              내일부터 그래프가 그려져요.
            </p>
          )}
        </Card>

        {insight.focus.length > 0 && (
          <Card className="p-0">
            <p className="border-b border-line px-4 py-2.5 text-sm font-semibold">
              지금 가장 자주 노크 중인 문제
              <span className="ml-1.5 text-xs font-normal text-muted">
                누르면 문제를 볼 수 있어요
              </span>
            </p>
            <ul>
              {insight.focus.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {summarize(r.text)}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[0.68rem] text-muted">
                        <span>{r.id}</span>
                        <span>
                          {r.correct}/{r.total} · {r.accuracy}%
                        </span>
                        <HistoryTimeline history={r.history} />
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-dist-hot/12 px-2 py-0.5 text-[0.68rem] font-semibold text-dist-hot">
                      {r.weight}배
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {selected && (
        <QuestionDetail
          row={selected}
          subjectCode={subjectCode}
          onClose={() => setSelected(null)}
        />
      )}
    </Section>
  );
}

function summarize(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 34 ? `${flat.slice(0, 34)}…` : flat;
}

const METRIC_TABS: {
  key: RankingMetric;
  label: string;
  format: (r: RankingRow) => string;
  value: (r: RankingRow) => number;
  note?: string;
}[] = [
  { key: "solved", label: "문제풀이", value: (r) => r.solved, format: (r) => `${r.solved.toLocaleString()}문제` },
  { key: "seconds", label: "공부시간", value: (r) => r.seconds, format: (r) => formatDuration(r.seconds) },
  {
    key: "accuracy",
    label: "정답률",
    value: (r) => r.accuracy,
    format: (r) => `${r.accuracy}%`,
    note: `${ACCURACY_MIN_SOLVED}문제 이상 푼 사람만 집계합니다`,
  },
  { key: "mastered", label: "마스터", value: (r) => r.mastered, format: (r) => `${r.mastered}문제`, note: "score 0 까지 내려놓은 문제 수" },
  { key: "days", label: "출석일수", value: (r) => r.days, format: (r) => `${r.days}일` },
  { key: "streak", label: "연속출석", value: (r) => r.streak, format: (r) => `${r.streak}일째`, note: "오늘 또는 어제까지 이어진 날 수" },
  { key: "best", label: "하루 최다", value: (r) => r.best, format: (r) => `${r.best}문제`, note: "하루에 가장 많이 푼 기록" },
];

function Ranking({ rows }: { rows: RankingRow[] }) {
  const [metric, setMetric] = useState<RankingMetric>("solved");
  const tab = METRIC_TABS.find((t) => t.key === metric)!;

  // 지표별로 다시 줄 세웁니다. rows 는 서버에서 가입 순으로 와 있어서
  // (JS sort 는 안정 정렬) 동점자는 먼저 가입한 사람이 앞섭니다.
  const ranked = useMemo(() => {
    const pool =
      metric === "accuracy" ? rows.filter((r) => r.solved >= ACCURACY_MIN_SOLVED) : rows;
    return [...pool]
      .filter((r) => tab.value(r) > 0)
      .sort((a, b) => tab.value(b) - tab.value(a))
      .slice(0, 50);
  }, [rows, metric, tab]);

  const myRank = ranked.findIndex((r) => r.isMe) + 1;

  return (
    <div className="space-y-3">
      <div className="scroll-x -mx-1 px-1">
        <div className="flex w-max gap-1.5">
          {METRIC_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMetric(t.key)}
              className={cx(
                "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition",
                metric === t.key
                  ? "bg-brand text-brand-fg"
                  : "bg-surface2 text-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab.note && <p className="text-[0.7rem] text-muted">{tab.note}</p>}

      {ranked.length === 0 ? (
        <Empty>아직 이 지표로 집계할 기록이 없어요.</Empty>
      ) : (
        <Card className="p-0">
          <p className="border-b border-line px-4 py-2.5 text-xs text-muted">
            {myRank > 0 ? (
              <>
                {tab.label} 내 순위 <b className="text-brand">{myRank}위</b>
              </>
            ) : (
              <>아직 이 지표 순위에 들지 않았어요</>
            )}
          </p>
          <ul>
            {ranked.map((r, i) => (
              <li
                key={r.userId}
                className={cx(
                  "flex items-center gap-3 px-4 py-2.5 text-sm",
                  r.isMe && "bg-brand/8 font-semibold",
                )}
              >
                <span className="w-7 shrink-0 text-center tabular-nums text-muted">
                  {medal(i) ?? i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {r.name}
                  {r.isMe && <span className="ml-1 text-[0.7rem] text-brand">나</span>}
                </span>
                <span className="shrink-0 tabular-nums">{tab.format(r)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** 1~3위만 표시를 달리해, 색이 아니라 기호로도 구분되게 합니다. */
function medal(index: number): string | null {
  return ["🥇", "🥈", "🥉"][index] ?? null;
}

function Comments({
  subjectCode,
  initial,
}: {
  subjectCode: string;
  initial: DashboardData["comments"];
}) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectCode, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "등록에 실패했습니다.");
      setComments(data.comments);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 200))}
          placeholder="한마디 남기기 (200자)"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button type="submit" className={btn.primary} disabled={busy || !body.trim()}>
          {busy ? "…" : "남기기"}
        </button>
      </form>

      {error && <ErrorBox message={error} />}

      {comments.length === 0 ? (
        <Empty>아직 남겨진 글이 없어요. 첫 글을 남겨보세요.</Empty>
      ) : (
        <ul className="space-y-2">
          {comments.map((c, i) => (
            <li key={`${c.createdAt}-${i}`} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="shrink-0 text-[0.68rem] text-muted">
                  {c.createdAt.slice(0, 10)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
