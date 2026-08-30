/** 서버·클라이언트가 함께 쓰는 도메인 타입 (여기에는 서버 전용 코드를 넣지 마세요) */

export type Subject = {
  code: string;
  name: string;
  group: string;
  sheetName: string;
  description: string;
  order: number;
};

export type Question = {
  id: string;
  text: string;
  answer: string;
  /** 정답 + 오답을 모두 담은 원본 보기 목록 (중복 제거·빈칸 제거 완료, 셔플 전) */
  options: string[];
  explanation: string;
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
