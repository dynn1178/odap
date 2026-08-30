import type { AnswerKind } from "./types";

/**
 * 기획안 2-2 — 대화형 응답 버튼 문구 풀.
 * 채점 시점에 단계별로 하나씩 뽑아 고정하고, 직전에 나온 문구는 연속으로 다시 뽑지 않습니다.
 */
export const PHRASES: Record<AnswerKind, string[]> = {
  S: [
    "다음 문제",
    "쉽네",
    "고고!!",
    "좋았어!",
    "이건 알지",
    "껌이지",
    "바로 다음",
    "자신 있음",
    "눈 감고도 맞춤",
    "이 정도야 뭐",
  ],
  L: [
    "사실 찍었음",
    "완전 우연임",
    "이게 맞다고?",
    "맞췄지만 어렵네",
    "운이 좋았다",
    "얼떨결에 맞음",
    "감으로 골랐어",
    "아직 잘 모르겠어",
    "반은 찍은 듯",
    "다시 보고 싶어",
  ],
  "1": [
    "아깝게 틀림",
    "맞출 수 있었는데",
    "실수였어",
    "알고 있었는데!",
    "손이 미끄러졌어",
    "아 이거였지",
    "착각했다",
    "거의 맞췄는데",
  ],
  "2": [
    "좀 어려웠다",
    "기억날 듯 말 듯",
    "몇 번 더 보면 알겠지",
    "가물가물해",
    "헷갈리는 문제네",
    "반쯤은 알겠어",
    "아슬아슬했다",
  ],
  "3": [
    "처음 보는건데?",
    "너무 어렵다",
    "난이도 극상",
    "세게 노크해줘",
    "하나도 모르겠어",
    "이건 새로 외워야 해",
    "백지야 백지",
  ],
};

/** 대시보드 범례·타임라인에서 쓰는 표시 정보 */
export const KIND_META: Record<
  AnswerKind,
  { label: string; icon: string; tone: string; short: string }
> = {
  S: { label: "확실히 앎", icon: "●", tone: "text-correct", short: "확신" },
  L: { label: "맞췄지만 불안", icon: "◐", tone: "text-lucky", short: "불안" },
  "1": { label: "실수", icon: "1", tone: "text-lvl1", short: "실수" },
  "2": { label: "조금 어렵네", icon: "2", tone: "text-lvl2", short: "조금" },
  "3": { label: "완전 어렵네", icon: "3", tone: "text-lvl3", short: "완전" },
};

/** 오답 화면 상단 노크 인사말 */
export const KNOCK_GREETINGS = [
  "똑똑, 다시 만났네요",
  "똑똑! 이 문제 또 찾아왔어요",
  "노크 노크 — 아직 안 외웠죠?",
  "똑똑, 조금만 더 친해져 볼까요",
  "여기 문 한 번 더 두드립니다",
];

/**
 * 홈 화면 환영 문구 — 방문할 때마다 하나씩 뽑습니다.
 * "두드리면 열린다"를 여러 각도로 비틀되, 훈계조로 들리지 않게 씁니다.
 */
export const HOME_MESSAGES = [
  "공부할 과목을 고르세요. 꾸준히 두드리면 열릴거에요.",
  "오늘도 한 번 두드려 볼까요. 과목부터 골라주세요.",
  "안 열리는 문은 아직 덜 두드린 문이에요.",
  "오늘 두드린 만큼 내일이 쉬워집니다.",
  "틀린 문제는 도망 안 가요. 천천히 하나씩 두드려요.",
  "몇 문제든 좋아요. 두드리다 보면 열립니다.",
  "어제보다 한 번만 더 두드려 봐요.",
  "오답은 적이 아니라 아직 안 열린 문일 뿐이에요.",
  "과목을 고르면 문 앞까지 데려다 드릴게요.",
  "짧게라도 매일. 그게 제일 세게 두드리는 방법이에요.",
  "오늘의 문, 열러 가볼까요?",
];

export function pickHomeMessage(): string {
  return HOME_MESSAGES[Math.floor(Math.random() * HOME_MESSAGES.length)];
}

export function pickPhrase(kind: AnswerKind, exclude?: string): string {
  const pool = PHRASES[kind];
  const candidates = pool.length > 1 && exclude ? pool.filter((p) => p !== exclude) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function pickGreeting(): string {
  return KNOCK_GREETINGS[Math.floor(Math.random() * KNOCK_GREETINGS.length)];
}
