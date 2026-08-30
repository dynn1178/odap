"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { LEVEL_BANDS, type LevelCounts, type LevelKey } from "@/lib/domain/progress";
import type { DailyPoint } from "@/lib/domain/view-types";

/**
 * 대시보드 차트 모음.
 *
 * 라이브러리를 붙이지 않고 인라인 SVG 로 그립니다. 필요한 게 꺾은선 하나와
 * 누적 막대 하나뿐이라 번들을 늘릴 이유가 없고, 색도 앱 토큰을 그대로 쓸 수 있습니다.
 */

const H = 168;
const PAD = { top: 14, right: 14, bottom: 24, left: 38 };

/** 컨테이너 실제 픽셀 폭을 재서 씁니다. viewBox 로 늘리면 글자까지 같이 찌그러집니다. */
function useChartWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

function shortDate(d: string): string {
  return d.slice(5).replace("-", ".");
}

/**
 * 각진 꺾은선 대신 부드러운 곡선.
 * Catmull-Rom 을 3차 베지어로 바꿔 그립니다 — 지나는 점은 그대로 두고 사이만 둥글게 잇습니다.
 * tension 을 낮게(0.5 미만) 잡아 값이 없는 곳까지 곡선이 튀어 오르지 않게 했습니다.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;

  const t = 0.35;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) * t * 0.5;
    const c1y = p1.y + (p2.y - p0.y) * t * 0.5;
    const c2x = p2.x - (p3.x - p1.x) * t * 0.5;
    const c2y = p2.y - (p3.y - p1.y) * t * 0.5;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** 축 눈금 3칸이면 충분합니다. 격자가 촘촘하면 선보다 격자가 먼저 읽힙니다. */
function ticks(max: number): number[] {
  return [0, max / 2, max];
}

export type MetricKey = "accuracy" | "solved" | "minutes";

export const METRICS: Record<
  MetricKey,
  { label: string; unit: string; value: (p: DailyPoint) => number; fixedMax?: number }
> = {
  accuracy: { label: "정답률", unit: "%", value: (p) => p.accuracy, fixedMax: 100 },
  solved: { label: "푼 문제", unit: "문제", value: (p) => p.solved },
  minutes: { label: "학습시간", unit: "분", value: (p) => Math.round(p.seconds / 60) },
};

/**
 * 날짜별 꺾은선 하나. 한 번에 한 지표만 그립니다 —
 * 축이 다른 두 지표를 한 그래프에 겹치면 어느 쪽이 오르는지 읽을 수 없습니다.
 */
export function TrendChart({ points, metric }: { points: DailyPoint[]; metric: MetricKey }) {
  const [ref, width] = useChartWidth();
  const [hover, setHover] = useState<number | null>(null);
  const spec = METRICS[metric];

  const values = points.map(spec.value);
  const rawMax = Math.max(...values, 0);
  const max = spec.fixedMax ?? Math.max(1, Math.ceil(rawMax * 1.15));

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const x = (i: number) => PAD.left + (points.length > 1 ? i * stepX : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (Math.min(v, max) / max) * innerH;

  const line = smoothPath(values.map((v, i) => ({ x: x(i), y: y(v) })));
  const area = points.length
    ? `${line} L${x(values.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`
    : "";

  const last = values.length - 1;
  const active = hover ?? last;

  return (
    <div className="relative" ref={ref}>
      {points.length > 0 && (
        <p className="mb-1 text-xs text-muted">
          최근 {shortDate(points[last].date)} ·{" "}
          <b className="text-ink tabular-nums">
            {values[last]}
            {spec.unit}
          </b>
        </p>
      )}
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`날짜별 ${spec.label} 추이`}
          onMouseLeave={() => setHover(null)}
        >
          {ticks(max).map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-line"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(t) + 3}
                textAnchor="end"
                className="fill-muted text-[9px] tabular-nums"
              >
                {Math.round(t)}
              </text>
            </g>
          ))}

          {points.length > 0 && (
            <>
              <path d={area} className="fill-brand/10" />
              <path
                d={line}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="stroke-brand"
              />
              {/* 값 라벨은 마지막 점에만 답니다. 모든 점에 숫자를 달면 선이 안 보입니다. */}
              <circle cx={x(active)} cy={y(values[active])} r={4} className="fill-brand" />
              <circle
                cx={x(active)}
                cy={y(values[active])}
                r={4}
                className="fill-none stroke-surface"
                strokeWidth={2}
              />
            </>
          )}

          {points.length > 0 && (
            <>
              <text x={x(0)} y={H - 7} textAnchor="start" className="fill-muted text-[9px]">
                {shortDate(points[0].date)}
              </text>
              {points.length > 1 && (
                <text x={x(last)} y={H - 7} textAnchor="end" className="fill-muted text-[9px]">
                  {shortDate(points[last].date)}
                </text>
              )}
            </>
          )}

          {/* 점보다 넉넉한 히트 영역 — 손가락으로도 집히도록 */}
          {points.map((p, i) => (
            <rect
              key={p.date}
              x={x(i) - Math.max(12, stepX / 2)}
              y={0}
              width={Math.max(24, stepX)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            />
          ))}
        </svg>
      )}

      {hover !== null && width > 0 && (
        <Tooltip
          x={x(active)}
          width={width}
          title={shortDate(points[active].date)}
          rows={[`${spec.label} ${values[active]}${spec.unit}`]}
        />
      )}
    </div>
  );
}

/** 날짜별 난이도 구간 누적 막대 — 초록(마스터)이 자랄수록 잘 되고 있는 겁니다. */
export function LevelTrendChart({ points }: { points: DailyPoint[] }) {
  const [ref, width] = useChartWidth();
  const [hover, setHover] = useState<number | null>(null);

  const withLevels = points.filter((p): p is DailyPoint & { levels: LevelCounts } => !!p.levels);
  const max = Math.max(
    1,
    ...withLevels.map((p) => p.levels.done + p.levels.mid + p.levels.hot),
  );

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const slot = withLevels.length > 0 ? innerW / withLevels.length : 0;
  const barW = Math.max(3, Math.min(22, slot - 3));

  const active = hover ?? withLevels.length - 1;

  return (
    <div className="relative" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label="날짜별 난이도 구간 변화"
          onMouseLeave={() => setHover(null)}
        >
          {ticks(max).map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={PAD.top + innerH - (t / max) * innerH}
                y2={PAD.top + innerH - (t / max) * innerH}
                className="stroke-line"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={PAD.top + innerH - (t / max) * innerH + 3}
                textAnchor="end"
                className="fill-muted text-[9px] tabular-nums"
              >
                {Math.round(t)}
              </text>
            </g>
          ))}

          {withLevels.map((p, i) => {
            const cx0 = PAD.left + slot * i + slot / 2 - barW / 2;
            let cursorY = PAD.top + innerH;
            return (
              <g key={p.date} opacity={hover === null || hover === i ? 1 : 0.45}>
                {LEVEL_BANDS.map((band) => {
                  const v = p.levels[band.key];
                  const h = (v / max) * innerH;
                  cursorY -= h;
                  if (v === 0) return null;
                  return (
                    <rect
                      key={band.key}
                      x={cx0}
                      /* 조각 사이 2px 는 배경색이 아니라 "틈" 이어야 겹쳐 보이지 않습니다 */
                      y={cursorY + 1}
                      width={barW}
                      height={Math.max(1, h - 2)}
                      rx={2}
                      className={FILL[band.key]}
                    />
                  );
                })}
                <rect
                  x={PAD.left + slot * i}
                  y={0}
                  width={Math.max(slot, 10)}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onTouchStart={() => setHover(i)}
                />
              </g>
            );
          })}

          {withLevels.length > 0 && (
            <>
              <text
                x={PAD.left}
                y={H - 7}
                textAnchor="start"
                className="fill-muted text-[9px]"
              >
                {shortDate(withLevels[0].date)}
              </text>
              <text
                x={width - PAD.right}
                y={H - 7}
                textAnchor="end"
                className="fill-muted text-[9px]"
              >
                {shortDate(withLevels[withLevels.length - 1].date)}
              </text>
            </>
          )}
        </svg>
      )}

      {hover !== null && width > 0 && (
        <Tooltip
          x={PAD.left + slot * active + slot / 2}
          width={width}
          title={shortDate(withLevels[active].date)}
          rows={LEVEL_BANDS.map((b) => `${b.label} ${withLevels[active].levels[b.key]}`)}
        />
      )}

      <LevelLegend />
    </div>
  );
}

const FILL: Record<LevelKey, string> = {
  done: "fill-dist-done",
  mid: "fill-dist-mid",
  hot: "fill-dist-hot",
};

const BG: Record<LevelKey, string> = {
  done: "bg-dist-done",
  mid: "bg-dist-mid",
  hot: "bg-dist-hot",
};

export function LevelLegend({ unseen = false }: { unseen?: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] text-muted">
      {LEVEL_BANDS.map((b) => (
        <span key={b.key} className="inline-flex items-center gap-1.5">
          <span className={cx("h-2.5 w-2.5 shrink-0 rounded-sm", BG[b.key])} />
          {b.label}
          <span className="text-[0.62rem] opacity-70">{b.hint}</span>
        </span>
      ))}
      {unseen && (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-surface2 ring-1 ring-inset ring-line" />
          아직 안 나옴
        </span>
      )}
    </div>
  );
}

/** 지금 이 순간의 난이도 분포 — 가로 누적 막대 하나 */
export function LevelBar({ counts, unseen }: { counts: LevelCounts; unseen: number }) {
  const total = counts.done + counts.mid + counts.hot + unseen;
  if (total === 0) return null;
  const pct = (n: number) => (n / total) * 100;

  return (
    <div>
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-lg">
        {LEVEL_BANDS.map((b) =>
          counts[b.key] > 0 ? (
            <div
              key={b.key}
              className={cx(BG[b.key], "first:rounded-l-lg last:rounded-r-lg")}
              style={{ width: `${pct(counts[b.key])}%` }}
              title={`${b.label} ${counts[b.key]}문제`}
            />
          ) : null,
        )}
        {unseen > 0 && (
          <div
            className="rounded-r-lg bg-surface2 ring-1 ring-inset ring-line"
            style={{ width: `${pct(unseen)}%` }}
            title={`아직 안 나옴 ${unseen}문제`}
          />
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LEVEL_BANDS.map((b) => (
          <div key={b.key} className="rounded-xl bg-surface2 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[0.72rem] text-muted">
              <span className={cx("h-2.5 w-2.5 shrink-0 rounded-sm", BG[b.key])} />
              {b.label}
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">
              {counts[b.key]}
              <span className="ml-1 text-xs font-medium text-muted">
                {Math.round(pct(counts[b.key]))}%
              </span>
            </div>
          </div>
        ))}
        <div className="rounded-xl bg-surface2 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[0.72rem] text-muted">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-surface ring-1 ring-inset ring-line" />
            아직 안 나옴
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-muted">
            {unseen}
            <span className="ml-1 text-xs font-medium">{Math.round(pct(unseen))}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tooltip({
  x,
  width,
  title,
  rows,
}: {
  x: number;
  width: number;
  title: string;
  rows: string[];
}) {
  // 끝쪽 점에서 툴팁이 잘리지 않도록 안쪽으로 당깁니다. 줄바꿈되면 폭 계산이 틀어지므로 nowrap.
  const HALF = 52;
  const clamped = Math.min(Math.max(x, HALF), Math.max(HALF, width - HALF));
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.68rem] leading-snug shadow-sm"
      style={{ left: clamped }}
    >
      <div className="font-semibold tabular-nums">{title}</div>
      {rows.map((r) => (
        <div key={r} className="tabular-nums text-muted">
          {r}
        </div>
      ))}
    </div>
  );
}

/** 최근 7일 vs 직전 7일 — 숫자 하나와 화살표 하나로 "나아지고 있나"를 답합니다. */
export function DeltaStat({
  label,
  value,
  unit,
  delta,
  hasPrev,
  higherIsBetter = true,
}: {
  label: string;
  value: number;
  unit: string;
  delta: number;
  hasPrev: boolean;
  higherIsBetter?: boolean;
}) {
  const flat = Math.abs(delta) < 0.05;
  const good = higherIsBetter ? delta > 0 : delta < 0;
  const tone = !hasPrev || flat ? "text-muted" : good ? "text-correct" : "text-wrong";
  const arrow = !hasPrev || flat ? "―" : delta > 0 ? "▲" : "▼";

  return (
    <div className="rounded-xl bg-surface2 px-3 py-3">
      <div className="text-[0.72rem] text-muted">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">
        {value}
        <span className="ml-0.5 text-xs font-medium text-muted">{unit}</span>
      </div>
      <div className={cx("mt-0.5 text-[0.7rem] font-semibold tabular-nums", tone)}>
        <span aria-hidden="true">{arrow}</span>{" "}
        {!hasPrev ? "비교할 지난주 없음" : flat ? "지난주와 같음" : `${Math.abs(delta)}${unit}`}
      </div>
    </div>
  );
}

/** 그래프를 못 읽는 환경을 위한 표 — 접었다 펼 수 있게 둡니다. */
export function DailyTable({ points }: { points: DailyPoint[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (points.length === 0) setOpen(false);
  }, [points.length]);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-muted underline underline-offset-2"
      >
        {open ? "숫자로 보기 닫기" : "숫자로 보기"}
      </button>
      {open && (
        <div className="scroll-x mt-2 max-h-64 overflow-y-auto rounded-xl border border-line">
          <table className="w-full min-w-[26rem] border-collapse text-xs">
            <thead className="sticky top-0 bg-surface2">
              <tr className="text-left text-muted">
                <th className="px-3 py-2 font-medium">날짜</th>
                <th className="px-2 py-2 text-right font-medium">푼 문제</th>
                <th className="px-2 py-2 text-right font-medium">정답률</th>
                <th className="px-2 py-2 text-right font-medium">학습시간</th>
                <th className="px-3 py-2 text-right font-medium">마스터/익숙/노크</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="border-t border-line/60">
                  <td className="px-3 py-1.5 tabular-nums">{p.date}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{p.solved}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{p.accuracy}%</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {Math.round(p.seconds / 60)}분
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted">
                    {p.levels ? `${p.levels.done}/${p.levels.mid}/${p.levels.hot}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
