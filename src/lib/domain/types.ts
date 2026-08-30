/** 서버·클라이언트가 함께 쓰는 도메인 타입 (여기에는 서버 전용 코드를 넣지 마세요) */

export type Subject = {
  code: string;
  name: string;
  group: string;
  sheetName: string;
  description: string;
  order: number;
  /** 한 행에서 정방향·역방향을 모두 내는 과목 (영단어 등) */
  bidirectional: boolean;
};

/** 한 문제를 화면에 내는 한 가지 방식 (양방향 과목은 방향이 둘) */
export type Facing = {
  text: string;
  answer: string;
  /** 정답 + 오답 (주관식이면 비어 있습니다) */
  options: string[];
};

export type Question = {
  id: string;
  text: string;
  answer: string;
  /** 정답 + 오답을 모두 담은 원본 보기 목록 (중복 제거·빈칸 제거 완료, 셔플 전) */
  options: string[];
  explanation: string;
  /** 보기 대신 직접 입력받아 채점 */
  open: boolean;
  /**
   * 뒤집은 문제 (양방향 과목만).
   * 학습 기록은 원래 문제와 같은 문제ID 로 합쳐서 남깁니다 —
   * 방향마다 따로 남기면 진도 셀 용량이 두 배가 됩니다.
   */
  reverse?: Facing;
};

/**
 * 응답 종류 = 진도 문자열의 이력 코드 (기획안 3-3)
 *  S: 정답 · 확실히 앎      L: 정답 · 맞췄지만 불안
 *  1: 오답 · 실수           2: 오답 · 조금 어렵네     3: 오답 · 완전 어렵네
 */
export type AnswerKind = "S" | "L" | "1" | "2" | "3";

export const ANSWER_KINDS: AnswerKind[] = ["S", "L", "1", "2", "3"];

export function isAnswerKind(v: unknown): v is AnswerKind {
  return typeof v === "string" && (ANSWER_KINDS as string[]).includes(v);
}

export function isCorrectKind(kind: AnswerKind): boolean {
  return kind === "S" || kind === "L";
}

/** 문제 1개의 학습 상태 */
export type Record0 = {
  score: number;
  streak: number;
  correct: number;
  wrong: number;
  /** 최근 12회 이력, 왼쪽이 과거 */
  history: string;
};

export type ProgressMap = Record<string, Record0>;

/** 클라이언트가 배치로 올려보내는 이벤트 (점수가 아니라 "무엇을 눌렀는지"를 보냅니다) */
export type SyncEvent = {
  subjectCode: string;
  questionId: string;
  kind: AnswerKind;
  /** 이 문제에 쓴 시간(초). 문제당 최대 120초로 캡됩니다. */
  seconds: number;
  /** 클라이언트 기준 응답 시각 (ISO). 서버는 날짜 집계에만 참고합니다. */
  at: string;
};

export type SubjectProgress = {
  subjectCode: string;
  progress: ProgressMap;
};
