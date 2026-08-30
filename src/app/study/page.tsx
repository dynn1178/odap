"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { KnockingDoor } from "@/components/KnockLogo";
import { PortalSearch } from "@/components/PortalSearch";
import { btn, cx, Empty, ErrorBox, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useQuestionTimer } from "@/hooks/useQuestionTimer";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { displayAnswer, gradeOpen } from "@/lib/domain/grade";
import { pickGreeting, pickPhrase } from "@/lib/domain/phrases";
import { applyAnswer, emptyRecord, requiredStreak, SCORE_DELTA } from "@/lib/domain/progress";
import { pickNextQuestion, shuffle } from "@/lib/domain/select";
import type { AnswerKind, ProgressMap, Question, Record0 } from "@/lib/domain/types";

type StudyData = {
  subject: { code: string; name: string; group: string };
  questions: Question[];
  warnings: string[];
  progress: ProgressMap;
  bidirectional: boolean;
};

/** 화면에 실제로 낸 문제 — 양방향 과목이면 방향에 따라 지문/정답/보기가 달라집니다 */
type Current = {
  q: Question;
  text: string;
  answer: string;
  options: string[];
  rec: Record0;
};

type Graded = {
  picked: string;
  isCorrect: boolean;
  /** 주관식에서 오타로 넘어간 경우 */
  typo: boolean;
  seconds: number;
  greeting: string;
};

/** 출제 방향 — 역방향은 사용자가 직접 고른 경우에만 나옵니다 */
type Direction = "forward" | "reverse" | "mixed";
const DIRECTION_LABELS: Record<Direction, string> = {
  forward: "정방향",
  reverse: "역방향",
  mixed: "섞어서",
};

const RECENT_KEY = (code: string) => `odap.recent.${code}`;
const DIRECTION_KEY = (code: string) => `odap.direction.${code}`;

export default function StudyPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <StudyInner />
    </Suspense>
  );
}

function StudyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const subjectCode = params.get("subject") ?? "";
  const { me, loading: authLoading } = useAuth();

  const [data, setData] = useState<StudyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Current | null>(null);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [session, setSession] = useState({ solved: 0, correct: 0 });
  const [showWarnings, setShowWarnings] = useState(false);
  /** 심화 학습 진행 표시 (없으면 평소대로 가중 추첨) */
  const [drill, setDrill] = useState<{ label: string; done: number; total: number } | null>(null);
  const [direction, setDirection] = useState<Direction>("forward");
  const [typed, setTyped] = useState("");

  const progressRef = useRef<ProgressMap>({});
  /** 남은 심화 학습 문제. setState 업데이터 안에서 큐를 꺼내면
   *  StrictMode 가 업데이터를 두 번 부를 때 문제가 두 개씩 사라집니다. */
  const drillRef = useRef<string[]>([]);
  const recentRef = useRef<string[]>([]);
  const lastPhraseRef = useRef<Partial<Record<AnswerKind, string>>>({});

  const timer = useQuestionTimer();
  const queue = useSyncQueue(me?.userId ?? "");

  useEffect(() => {
    if (!authLoading && !me) router.replace("/login");
  }, [authLoading, me, router]);

  // ── 과목 진입 시 1회: 문제 전체 + 내 진도 ──
  const load = useCallback(() => {
    if (!subjectCode) return;
    setError(null);
    setData(null);
    fetch(`/api/study?subject=${encodeURIComponent(subjectCode)}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "문제를 불러오지 못했습니다.");
        return body as StudyData;
      })
      .then((body) => {
        progressRef.current = body.progress ?? {};
        try {
          const saved = sessionStorage.getItem(RECENT_KEY(subjectCode));
          recentRef.current = saved ? (JSON.parse(saved) as string[]) : [];
        } catch {
          recentRef.current = [];
        }
        try {
          const d = localStorage.getItem(DIRECTION_KEY(subjectCode));
          if (d === "forward" || d === "reverse" || d === "mixed") setDirection(d);
        } catch {
          /* 저장된 방향을 못 읽어도 정방향으로 계속합니다 */
        }
        setData(body);
      })
      .catch((e: Error) => setError(e.message));
  }, [subjectCode]);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  const show = useCallback(
    (q: Question) => {
      // 역방향은 사용자가 직접 고른 경우에만 씁니다. 뒤집을 수 없는 문제는 정방향 그대로.
      const useReverse =
        !!q.reverse && (direction === "reverse" || (direction === "mixed" && Math.random() < 0.5));
      const facing = useReverse ? q.reverse! : q;

      setGraded(null);
      setTyped("");
      setCurrent({
        q,
        text: facing.text,
        answer: facing.answer,
        options: shuffle(facing.options),
        rec: progressRef.current[q.id] ?? emptyRecord(),
      });
      timer.reset();
    },
    [timer, direction],
  );

  /**
   * 심화 학습 중이면 그 묶음을 순서대로 소진하고, 다 풀면 평소 출제로 돌아갑니다.
   * 평소에는 기획안 2-3 의 가중 추첨을 씁니다.
   */
  const nextQuestion = useCallback(
    (questions: Question[]) => {
      let picked: Question | undefined;

      // 시트에서 빠진 문제는 건너뛰고 다음 것을 봅니다.
      while (!picked && drillRef.current.length > 0) {
        const head = drillRef.current.shift()!;
        picked = questions.find((q) => q.id === head);
      }

      if (picked) {
        setDrill((d) => (d ? { ...d, done: d.done + 1 } : d));
      } else {
        // 묶음을 다 풀었으면 평소 출제로 돌아갑니다.
        setDrill(null);
        picked = pickNextQuestion(questions, progressRef.current, recentRef.current);
      }

      if (!picked) {
        setCurrent(null);
        return;
      }
      show(picked);
    },
    [show],
  );

  useEffect(() => {
    if (!data || current) return;

    // 대시보드에서 "몰아서 풀기"(또는 문제 하나 다시 풀기)로 들어온 경우.
    const ids = (params.get("drill") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const available = ids.filter((id) => data.questions.some((q) => q.id === id));

    if (available.length > 0) {
      const [head, ...rest] = available;
      drillRef.current = rest;
      setDrill({ label: params.get("label") ?? "심화 학습", done: 1, total: available.length });
      show(data.questions.find((q) => q.id === head)!);
      return;
    }

    nextQuestion(data.questions);
    // 최초 1회만 문제를 뽑습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const onPick = (option: string) => {
    if (!current || graded) return;
    const seconds = timer.stop();
    setGraded({
      picked: option,
      isCorrect: option === current.answer,
      typo: false,
      seconds,
      greeting: pickGreeting(),
    });
  };

  /** 주관식 제출 — 대소문자·공백·마침표는 무시하고, 한 글자 오타까지는 넘어갑니다 */
  const onSubmitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || graded || !typed.trim()) return;
    const seconds = timer.stop();
    const verdict = gradeOpen(typed, current.answer);
    setGraded({
      picked: typed.trim(),
      isCorrect: verdict !== "wrong",
      typo: verdict === "typo",
      seconds,
      greeting: pickGreeting(),
    });
  };

  const onRespond = (kind: AnswerKind) => {
    if (!current || !graded || !data) return;

    queue.push({
      subjectCode: data.subject.code,
      questionId: current.q.id,
      kind,
      seconds: graded.seconds,
      at: new Date().toISOString(),
    });

    progressRef.current[current.q.id] = applyAnswer(progressRef.current[current.q.id], kind);

    recentRef.current = [...recentRef.current, current.q.id].slice(-5);
    try {
      sessionStorage.setItem(RECENT_KEY(data.subject.code), JSON.stringify(recentRef.current));
    } catch {
      /* 저장 실패해도 학습은 계속됩니다 */
    }

    setSession((s) => ({
      solved: s.solved + 1,
      correct: s.correct + (graded.isCorrect ? 1 : 0),
    }));
    nextQuestion(data.questions);
  };

  // 정답/오답에 따른 응답 버튼 (문구는 채점 시점에 한 번만 뽑아 고정)
  const responses = useMemo(() => {
    if (!graded) return [];
    const kinds: AnswerKind[] = graded.isCorrect ? ["S", "L"] : ["1", "2", "3"];
    return kinds.map((kind) => {
      const phrase = pickPhrase(kind, lastPhraseRef.current[kind]);
      lastPhraseRef.current[kind] = phrase;
      return { kind, phrase };
    });
    // graded 가 바뀔 때만 새로 뽑습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graded]);

  if (authLoading || !me) return null;

  if (!subjectCode) {
    return (
      <AppShell>
        <Empty>
          과목이 지정되지 않았습니다.{" "}
          <Link href="/" className="text-brand underline">
            과목 선택으로 가기
          </Link>
        </Empty>
      </AppShell>
    );
  }

  const subject = data ? { code: data.subject.code, name: data.subject.name } : undefined;

  return (
    <AppShell subject={subject}>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!error && !data && <Spinner label="문제를 불러오는 중" />}

      {data && (
        <>
          <div className="mb-2 flex items-center justify-between gap-2 text-[0.7rem] text-muted">
            <span className="tabular-nums">
              이번 세션 {session.solved}문제
              {session.solved > 0 && (
                <> · 정답률 {Math.round((session.correct / session.solved) * 100)}%</>
              )}
            </span>
            <span className="flex items-center gap-2">
              {queue.pending > 0 && <span>저장 대기 {queue.pending}</span>}
              {data.warnings.length > 0 && (
                <button
                  type="button"
                  className="text-brand underline"
                  onClick={() => setShowWarnings((v) => !v)}
                >
                  시트 경고 {data.warnings.length}
                </button>
              )}
            </span>
          </div>

          {data.bidirectional && (
            <div className="mb-2 flex items-center gap-2">
              <span className="shrink-0 text-[0.7rem] text-muted">출제 방향</span>
              <div className="flex flex-1 gap-1 rounded-lg bg-surface2 p-0.5">
                {(Object.keys(DIRECTION_LABELS) as Direction[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDirection(d);
                      try {
                        localStorage.setItem(DIRECTION_KEY(subjectCode), d);
                      } catch {
                        /* 저장 실패해도 이번 세션에는 적용됩니다 */
                      }
                    }}
                    className={cx(
                      "flex-1 rounded-md px-2 py-1.5 text-[0.72rem] font-semibold transition",
                      direction === d ? "bg-surface text-ink shadow-sm" : "text-muted",
                    )}
                  >
                    {DIRECTION_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {drill && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-brand/40 bg-brand/5 px-3 py-2 text-xs">
              <span className="min-w-0 truncate font-semibold text-brand">
                심화 학습 · {drill.label}
                <span className="ml-1.5 font-medium tabular-nums text-muted">
                  {drill.done}/{drill.total}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  drillRef.current = [];
                  setDrill(null);
                }}
                className="shrink-0 text-muted underline"
              >
                평소대로 풀기
              </button>
            </div>
          )}

          {queue.error && (
            <div className="mb-3 rounded-xl border border-lvl1/40 bg-lvl1/5 p-3 text-xs text-lvl1">
              {queue.error} 인터넷이 돌아오면 자동으로 다시 보냅니다.
            </div>
          )}

          {showWarnings && data.warnings.length > 0 && (
            <ul className="mb-3 space-y-1 rounded-xl border border-line bg-surface2 p-3 text-xs text-muted">
              {data.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          )}

          {!current && (
            <Empty>
              출제할 문제가 없습니다. 문제 시트에 <b>사용여부 Y</b> 인 문제가 있는지 확인해 주세요.
            </Empty>
          )}

          {current && (
            <div>
              <QuestionBody
                text={current.text}
                answer={current.answer}
                options={current.options}
                open={current.q.open}
                typed={typed}
                onTyped={setTyped}
                onSubmitTyped={onSubmitTyped}
                graded={graded}
                onPick={onPick}
              />

              {graded && (
                <ResponsePanel
                  isCorrect={graded.isCorrect}
                  typo={graded.typo}
                  greeting={graded.greeting}
                  answer={current.answer}
                  open={current.q.open}
                  explanation={current.q.explanation}
                  rec={current.rec}
                  responses={responses}
                  onRespond={onRespond}
                />
              )}

              {/* 난이도 버튼과 충분히 떨어뜨려 둡니다 — 붙어 있으면 잘못 누르기 쉽습니다. */}
              <div className="mt-12 border-t border-line/60 pt-4">
                <PortalSearch text={current.text} />
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

/**
 * 지문은 헤더 바로 아래에 붙여 두고, 보기부터는 페이지와 함께 흐릅니다.
 * 스크롤 영역을 여러 개 두면 어느 걸 굴리는지 헷갈려서, 페이지 스크롤 하나만 씁니다.
 * (지문이 아주 길 때만 지문 안쪽이 스크롤됩니다.)
 */
/**
 * 지문은 헤더 바로 아래에 붙여 두고, 보기부터는 페이지와 함께 흐릅니다.
 * 스크롤 영역을 여러 개 두면 어느 걸 굴리는지 헷갈려서, 페이지 스크롤 하나만 씁니다.
 * (지문이 아주 길 때만 지문 안쪽이 스크롤됩니다.)
 */
function QuestionBody({
  text,
  answer,
  options,
  open,
  typed,
  onTyped,
  onSubmitTyped,
  graded,
  onPick,
}: {
  text: string;
  answer: string;
  options: string[];
  open: boolean;
  typed: string;
  onTyped: (v: string) => void;
  onSubmitTyped: (e: React.FormEvent) => void;
  graded: Graded | null;
  onPick: (option: string) => void;
}) {
  const revealed = Boolean(graded);

  return (
    <>
      <div className="sticky top-[var(--header-h)] z-10 -mx-3 border-b border-line bg-bg px-3 py-3 sm:-mx-4 sm:px-4">
        <p className="max-h-[34dvh] overflow-y-auto whitespace-pre-wrap break-words text-[1.05rem] font-semibold leading-relaxed">
          {text}
        </p>
      </div>

      {open ? (
        <form onSubmit={onSubmitTyped} className="mt-3 space-y-2">
          <input
            value={revealed ? graded!.picked : typed}
            onChange={(e) => onTyped(e.target.value)}
            disabled={revealed}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="답을 입력하세요"
            className={cx(
              "w-full rounded-xl border bg-surface px-4 py-3 outline-none disabled:opacity-90",
              !revealed && "border-line focus:border-brand",
              revealed && graded!.isCorrect && "border-correct bg-correct/10 text-correct",
              revealed && !graded!.isCorrect && "border-wrong bg-wrong/10 text-wrong",
            )}
          />
          {!revealed && (
            <button type="submit" className={cx(btn.primary, "w-full")} disabled={!typed.trim()}>
              제출
            </button>
          )}
          {revealed && (
            <p className="px-1 text-xs text-muted">
              {graded!.typo
                ? "오타는 넘어갈게요 — 정답으로 처리했어요."
                : graded!.isCorrect
                  ? "정답이에요."
                  : `정답: ${displayAnswer(answer, true)}`}
            </p>
          )}
        </form>
      ) : (
        <ul className="mt-3 space-y-2">
          {options.map((option) => {
            const isAnswer = option === answer;
            const isPicked = graded?.picked === option;

            return (
              <li key={option}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => onPick(option)}
                  className={cx(
                    "flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[0.95rem] leading-relaxed transition",
                    "min-h-[44px] disabled:cursor-default",
                    !revealed && "border-line bg-surface hover:border-brand/60 hover:bg-surface2",
                    revealed && isAnswer && "border-correct bg-correct/10 text-correct",
                    revealed && isPicked && !isAnswer && "border-wrong bg-wrong/10 text-wrong",
                    revealed && !isAnswer && !isPicked && "border-line opacity-55",
                  )}
                >
                  <span aria-hidden="true" className="mt-0.5 w-4 shrink-0 text-center font-bold">
                    {revealed ? (isAnswer ? "○" : isPicked ? "✕" : "") : ""}
                  </span>
                  <span className="whitespace-pre-wrap break-words">{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function ResponsePanel({
  isCorrect,
  typo,
  greeting,
  answer,
  open,
  explanation,
  rec,
  responses,
  onRespond,
}: {
  isCorrect: boolean;
  typo: boolean;
  greeting: string;
  answer: string;
  open: boolean;
  explanation: string;
  rec: Record0;
  responses: { kind: AnswerKind; phrase: string }[];
  onRespond: (kind: AnswerKind) => void;
}) {
  return (
    <div className="animate-fade-up mt-3 space-y-2.5">
      <div
        className={cx(
          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
          isCorrect ? "border-correct/40 bg-correct/5" : "border-brand/40 bg-brand/5",
        )}
      >
        {isCorrect ? (
          <span className="text-xl" aria-hidden="true">
            ✅
          </span>
        ) : (
          <KnockingDoor size={28} />
        )}
        <div className="min-w-0">
          <p className={cx("font-bold", isCorrect ? "text-correct" : "text-brand")}>
            {isCorrect ? (typo ? "정답입니다 (오타 통과)" : "정답입니다") : greeting}
          </p>
          {!isCorrect && (
            <p className="mt-0.5 break-words text-sm text-muted">
              정답은 <b className="text-ink">{displayAnswer(answer, open)}</b> 였어요.
            </p>
          )}
        </div>
      </div>

      {explanation && (
        <div className="rounded-xl border border-line bg-surface2 p-3 text-[0.9rem] leading-relaxed">
          <p className="mb-1 text-xs font-bold text-muted">해설</p>
          <p className="whitespace-pre-wrap break-words">{explanation}</p>
        </div>
      )}

      {/* 항상 한 줄. 세로로 쌓으면 모바일에서 화면의 절반을 먹습니다. */}
      <div>
        <p className="mb-1.5 text-xs text-muted">
          {isCorrect ? "얼마나 확실했나요?" : "얼마나 어려웠나요?"}
        </p>
        <div
          className={cx(
            "grid gap-1.5",
            responses.length === 2 ? "grid-cols-2" : "grid-cols-3",
          )}
        >
          {responses.map(({ kind, phrase }) => (
            <button
              key={kind}
              type="button"
              onClick={() => onRespond(kind)}
              className={cx(
                "flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-2 text-center font-semibold leading-tight transition active:scale-[0.98]",
                "text-[0.78rem] break-keep sm:text-[0.9rem]",
                kindStyle(kind),
              )}
            >
              <span>{phrase}</span>
              <span className="text-[0.62rem] font-medium opacity-60">
                {badgeText(kind, rec)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function kindStyle(kind: AnswerKind): string {
  switch (kind) {
    case "S":
      return "border-correct/50 bg-correct/10 text-correct hover:bg-correct/15";
    case "L":
      return "border-lucky/50 bg-lucky/10 text-lucky hover:bg-lucky/15";
    case "1":
      return "border-lvl1/50 bg-lvl1/10 text-lvl1 hover:bg-lvl1/15";
    case "2":
      return "border-lvl2/50 bg-lvl2/10 text-lvl2 hover:bg-lvl2/15";
    default:
      return "border-lvl3/50 bg-lvl3/10 text-lvl3 hover:bg-lvl3/15";
  }
}

/** 가중치 변화를 작게 알려 줍니다 (기획안 2-2) */
function badgeText(kind: AnswerKind, rec: Record0): string {
  if (kind !== "S") return `+${SCORE_DELTA[kind]}`;
  if (rec.score === 0) return "0 유지";
  const need = requiredStreak(rec.score);
  const n = rec.streak + 1;
  return n >= need ? "−1 적용" : `−1 · 연속 ${n}/${need}`;
}
