import type { AnswerKind } from "./types";
import type { Milestone } from "./progress";

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
    "완전 확실해",
    "고민도 안 했어",
    "이건 내 거야",
    "외운 보람 있네",
    "바로 떠올랐어",
    "다음 거 주세요",
    "이건 서비스지",
    "머리에 박혀 있음",
    "속도 좀 올려도 돼",
    "몸이 기억한다",
    "물어보나 마나",
    "얘는 이제 졸업",
    "가볍게 통과",
    "한 방에 끝",
    "더 어려운 거 없나요",
    "눈에 익다 못해 친함",
    "생각할 틈도 없었어",
    "이건 안 틀림",
    "자신 있게 골랐어",
    "가뿐하다",
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
    "긴가민가했는데",
    "운빨이었어",
    "솔직히 자신 없었어",
    "설명은 못 하겠어",
    "손이 먼저 갔어",
    "둘 중에 고민했어",
    "다음엔 틀릴 듯",
    "어깨너머로 아는 느낌",
    "맞긴 했는데 찜찜해",
    "한 번 더 만나자",
    "확신은 0%",
    "우연히 걸렸다",
    "이건 아직 내 게 아냐",
    "다시 물어보면 위험",
    "겨우 건졌다",
    "찍신이 도왔다",
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
    "아 진짜 아는 건데",
    "잘못 눌렀어",
    "읽다가 헷갈렸어",
    "한 끗 차이였네",
    "방금 알았는데 왜",
    "급하게 골랐다",
    "다음엔 안 틀려",
    "아까워 죽겠네",
    "문제를 잘못 봤어",
    "머리는 알았는데 손이",
    "억울하다 진짜",
    "이건 실수로 쳐줘",
    "한 번만 더 보면 돼",
  ],
  "2": [
    "좀 어려웠다",
    "기억날 듯 말 듯",
    "몇 번 더 보면 알겠지",
    "가물가물해",
    "헷갈리는 문제네",
    "반쯤은 알겠어",
    "아슬아슬했다",
    "본 적은 있는데",
    "혀끝에서 맴돌아",
    "조금만 더 하면 될 듯",
    "애매하게 알고 있었어",
    "비슷한 거랑 섞였어",
    "복습이 필요해",
    "감은 잡히는데",
    "절반은 이미 내 거야",
    "다음엔 잡는다",
    "머리에 덜 붙었네",
    "좀 더 두드려야겠다",
    "알 듯 말 듯 얄밉네",
    "한 번 더 만나면 알겠어",
  ],
  "3": [
    "처음 보는건데?",
    "너무 어렵다",
    "난이도 극상",
    "세게 노크해줘",
    "하나도 모르겠어",
    "이건 새로 외워야 해",
    "백지야 백지",
    "본 적도 없어",
    "완전 처음이야",
    "손도 못 대겠다",
    "다음엔 뚫어본다",
    "자주 보여줘",
    "아예 모르는 영역",
    "머릿속이 하얘",
    "이건 공부부터 해야 해",
    "많이 두드려 주세요",
    "지금은 도저히",
    "완전 낯설다",
    "감도 안 잡혀",
    "그래도 한 번 더 두드려본다",
    "다시 처음부터",
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

/**
 * [힌트 보기] 버튼 아래 작은 글씨 — 문제마다 하나씩 뽑습니다.
 * 막지는 않지만 "안 보는 게 이득"이라는 신호를 계속 주는 게 목적이라,
 * 나무라는 말투 대신 슬쩍 말리는 정도로만 씁니다.
 */
export const HINT_TEASERS = [
  "정말 궁금할 때만 눌러보기. 최대한 보지 않도록 노력해요.",
  "힌트는 마지막 수단이에요. 먼저 3초만 더 생각해 볼까요?",
  "안 보고 맞히면 훨씬 오래 기억에 남아요.",
  "한 번 더 떠올려 보고, 그래도 안 되면 눌러요.",
  "힌트 없이 넘긴 문제가 진짜 내 문제예요.",
  "눌러도 되지만, 안 누르면 더 좋아요.",
  "조금만 더 버텨볼까요? 문은 거의 열렸어요.",
  "정말 막혔을 때만. 아껴 쓸수록 값어치가 커져요.",
  "지금 안 보면 다음에 혼자 풀 수 있어요.",
  "손이 먼저 가기 전에, 머리에게 한 번만 더 기회를.",
  "여기서 참으면 기억이 한 뼘 더 자랍니다.",
  "급할 때만 살짝. 습관이 되면 효과가 줄어요.",
  "모르겠으면 틀려도 괜찮아요. 그게 더 남아요.",
  "힌트를 보면 이 문제는 조금 더 자주 찾아옵니다.",
];

export function pickHintTeaser(): string {
  return HINT_TEASERS[Math.floor(Math.random() * HINT_TEASERS.length)];
}

/**
 * ─── 진도율/마스터율 마일스톤 축하 문구 ───
 * 10% 단위로 새로 넘길 때마다 하나씩 뽑아 보여줍니다 (기획 요청 1·2).
 * 10~90%는 그때그때 숫자를 채워 넣는 템플릿을 쓰고, 100%(완주)만 따로 문구를 둡니다 —
 * 열 단계 전부를 손으로 써 내려가면 비슷한 말만 늘어나고, 완주는 톤 자체가 달라서입니다.
 */
export const PROGRESS_MILESTONE_TEMPLATES: ((m: number) => string)[] = [
  (m) => `벌써 공부 진도가 ${m}%를 넘었어요. 조금만 더 화이팅!`,
  (m) => `진도율 ${m}% 돌파! 이 페이스면 금방이에요.`,
  (m) => `문이 ${m}%만큼 열렸어요. 계속 두드려봐요.`,
  (m) => `전체 문제 중 ${m}%를 만나봤어요.`,
];

export const PROGRESS_COMPLETE_MESSAGES = [
  "전체 문제를 다 만나봤어요! 진도율 100% 달성!!",
  "진도율 100% — 이 과목 문제를 전부 풀어봤어요.",
  "끝까지 왔어요! 이제부터는 복습으로 더 단단하게.",
  "완주 축하해요. 진도율 100%!",
];

export const MASTERY_MILESTONE_TEMPLATES: ((m: number) => string)[] = [
  (m) => `완전히 내 것으로 만든 문제가 벌써 ${m}%를 넘었어요.`,
  (m) => `마스터율 ${m}% 돌파! 확실히 아는 문제가 늘고 있어요.`,
  (m) => `마스터율 ${m}% — 아는 문제가 착실히 쌓이고 있어요.`,
  (m) => `${m}%만큼 완전히 내 것으로 만들었어요.`,
];

export const MASTERY_COMPLETE_MESSAGES = [
  "100% 마스터 달성!!",
  "이 과목 전체를 완전히 마스터했어요. 축하해요!",
  "마스터율 100% — 더는 흔들리지 않아요.",
];

function pickTemplate(templates: ((m: number) => string)[], m: number): string {
  return templates[Math.floor(Math.random() * templates.length)](m);
}

function pickFrom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickProgressMilestoneMessage(m: Milestone): string {
  return m === 100 ? pickFrom(PROGRESS_COMPLETE_MESSAGES) : pickTemplate(PROGRESS_MILESTONE_TEMPLATES, m);
}

export function pickMasteryMilestoneMessage(m: Milestone): string {
  return m === 100 ? pickFrom(MASTERY_COMPLETE_MESSAGES) : pickTemplate(MASTERY_MILESTONE_TEMPLATES, m);
}

/** 축하 팝업 하단 한줄 소감 입력창 위에 붙는 말 — 매번 하나씩 뽑습니다. */
export const NOTE_PROMPTS = [
  "지금 공부 소감을 한줄로 남겨볼까요?",
  "이 순간의 마음을 한마디로 남겨보세요.",
  "한줄 남기면 대시보드에 이 시점 기록으로 남아요.",
  "지금 느낀 걸 짧게 적어볼까요?",
];

export function pickNotePrompt(): string {
  return NOTE_PROMPTS[Math.floor(Math.random() * NOTE_PROMPTS.length)];
}

/** 공유 버튼 문구 — 매번 하나씩 뽑습니다. 과장 없이 담백하게 둡니다. */
export const SHARE_LABELS = [
  "지인들에게 공유하기",
  "친구에게 공유하기",
  "내 학습상황 공유하기",
  "학습 현황 공유하기",
  "가족에게 공유하기",
];

export function pickShareLabel(): string {
  return SHARE_LABELS[Math.floor(Math.random() * SHARE_LABELS.length)];
}
