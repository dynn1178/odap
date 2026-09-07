/**
 * 진도율/마스터율 공유 카드 — html2canvas 같은 DOM 캡처 라이브러리 없이
 * Canvas 2D API로 직접 그립니다. 색은 globals.css 라이트 팔레트를 그대로 씁니다
 * (보는 사람 기기 테마와 무관하게 카드 모양이 항상 같아야 공유 이미지로 자연스럽습니다).
 */

const COLOR = {
  bg: "rgb(250, 249, 246)",
  surface: "rgb(255, 255, 255)",
  border: "rgb(226, 221, 211)",
  text: "rgb(28, 25, 23)",
  muted: "rgb(120, 113, 108)",
  brand: "rgb(180, 83, 9)",
  brandFg: "rgb(255, 255, 255)",
  done: "rgb(22, 101, 52)",
};

const SIZE = 1080;

export type StatsCardInput = {
  subjectName: string;
  /** 카드 오른쪽 위에 배지로 넣을 이름 — 없으면 배지를 그리지 않습니다. */
  userName?: string;
  progressPct: number;
  masteryPct: number;
  seen: number;
  total: number;
  mastered: number;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  opts: { x: number; y: number; w: number; h: number; pct: number; color: string; label: string; sub: string },
) {
  const { x, y, w, h, pct, color, label, sub } = opts;

  ctx.fillStyle = COLOR.text;
  ctx.font = "600 34px 'Pretendard Variable', sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, x, y - 46);

  ctx.fillStyle = color;
  ctx.font = "700 40px 'Pretendard Variable', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(pct)}%`, x + w, y - 46);
  ctx.textAlign = "left";

  ctx.fillStyle = COLOR.border;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();

  const filled = Math.max(0, Math.min(w, (w * pct) / 100));
  if (filled > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, filled, h, h / 2);
    ctx.fill();
  }

  ctx.fillStyle = COLOR.muted;
  ctx.font = "400 26px 'Pretendard Variable', sans-serif";
  ctx.fillText(sub, x, y + h + 40);
}

/** 브랜드 라벨과 같은 줄, 카드 오른쪽 위에 이름을 알약(pill) 배지로 넣습니다. */
function drawNameBadge(ctx: CanvasRenderingContext2D, userName: string) {
  const label = `${userName}님`;
  ctx.font = "700 30px 'Pretendard Variable', sans-serif";
  const textWidth = ctx.measureText(label).width;

  const padX = 26;
  const h = 58;
  const w = textWidth + padX * 2;
  const x = SIZE - 120 - w;
  const y = 190 - 32 - (h - 32) / 2;

  ctx.fillStyle = "rgba(180, 83, 9, 0.12)";
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(180, 83, 9, 0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();

  ctx.fillStyle = COLOR.brand;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/** 진도율/마스터율 카드를 1080x1080 PNG Blob 으로 그립니다. */
export async function drawStatsCard(input: StatsCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 그릴 수 없습니다.");

  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = COLOR.surface;
  roundRect(ctx, 60, 60, SIZE - 120, SIZE - 120, 40);
  ctx.fill();
  ctx.strokeStyle = COLOR.border;
  ctx.lineWidth = 2;
  roundRect(ctx, 60, 60, SIZE - 120, SIZE - 120, 40);
  ctx.stroke();

  ctx.fillStyle = COLOR.brand;
  ctx.font = "700 32px 'Pretendard Variable', sans-serif";
  ctx.fillText("오답노크", 120, 190);

  if (input.userName) drawNameBadge(ctx, input.userName);

  ctx.fillStyle = COLOR.text;
  ctx.font = "700 56px 'Pretendard Variable', sans-serif";
  ctx.fillText(input.subjectName, 120, 270);

  const barX = 120;
  const barW = SIZE - 240;

  drawBar(ctx, {
    x: barX,
    y: 430,
    w: barW,
    h: 44,
    pct: input.progressPct,
    color: COLOR.brand,
    label: "진도율",
    sub: `전체 ${input.total}문제 중 ${input.seen}문제를 만났어요`,
  });

  drawBar(ctx, {
    x: barX,
    y: 680,
    w: barW,
    h: 44,
    pct: input.masteryPct,
    color: COLOR.done,
    label: "마스터율",
    sub: `${input.mastered}문제를 완전히 마스터했어요`,
  });

  ctx.fillStyle = COLOR.muted;
  ctx.font = "400 24px 'Pretendard Variable', sans-serif";
  ctx.fillText("오답의 문을 두드리는 중 — 오답노크", 120, SIZE - 110);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("이미지를 만들지 못했습니다."));
    }, "image/png");
  });
}

/**
 * navigator.share 로 파일 공유(카카오톡 등 공유 시트)를 시도하고,
 * 지원하지 않는 환경(대부분 데스크톱)에서는 PNG 다운로드로 대신합니다.
 */
export async function shareStatsImage(blob: Blob, subjectName: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], `오답노크-${subjectName}.png`, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({
      files: [file],
      title: "오답노크",
      text: `${subjectName} 학습 현황이에요.`,
    });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
