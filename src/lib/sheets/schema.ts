/**
 * ─────────────────────────────────────────────────────────────
 * 구글시트 ↔ 앱 필드 매핑 (기획안 4-0)
 *
 * 앱은 열 순서가 아니라 "1행 헤더 텍스트"로 열을 찾습니다.
 * 시트의 컬럼명을 바꾸고 싶으면 **이 파일만** 고치면 됩니다.
 * 열 순서를 바꾸거나 메모용 열을 추가해도 앱은 그대로 동작합니다.
 * ─────────────────────────────────────────────────────────────
 */

/** 고정 시트 이름 */
export const SHEET = {
  subjects: "과목목록",
  users: "회원",
  progress: "진도",
  dailyStats: "일별통계",
  comments: "한줄남기기",
} as const;

/** 과목목록 시트 */
export const SUBJECT_COLS = {
  code: "과목코드",
  name: "과목명",
  group: "상위그룹",
  sheetName: "문제시트명",
  description: "설명",
  order: "노출순서",
  active: "사용여부",
  /** Y 면 한 행에서 정방향·역방향 문제를 모두 냅니다 (영단어 과목용) */
  bidirectional: "양방향",
} as const;

/** 문제_○○○ 시트 (과목마다 1개) */
export const QUESTION_COLS = {
  id: "문제ID",
  text: "문제",
  answer: "정답",
  explanation: "해설",
  active: "사용여부",
  /** Y 면 보기 대신 직접 입력받아 채점합니다 */
  open: "주관식",
} as const;

/** 오답 보기 컬럼: 보기2 ~ 보기7 (빈칸 허용) */
export const OPTION_COLS = ["보기2", "보기3", "보기4", "보기5", "보기6", "보기7"] as const;

/** 회원 시트 */
export const USER_COLS = {
  id: "회원ID",
  name: "이름",
  pinHash: "PIN해시",
  salt: "솔트",
  createdAt: "가입일시",
  lastSeenAt: "최근접속일시",
} as const;

/** 진도 시트 */
export const PROGRESS_COLS = {
  userId: "회원ID",
  subjectCode: "과목코드",
  data: "진도데이터",
  updatedAt: "갱신일시",
} as const;

/**
 * 일별통계 시트 — (회원, 날짜, 과목)당 1행.
 * 대시보드가 과목 하위 화면이므로 과목코드까지 키에 포함합니다.
 */
export const DAILY_COLS = {
  userId: "회원ID",
  date: "날짜",
  subjectCode: "과목코드",
  solved: "푼문제수",
  correct: "정답수",
  wrong: "오답수",
  seconds: "학습시간초",
  /** 그날 마지막 동기화 시점의 난이도 구간 스냅샷 "마스터,익숙,노크중" */
  levels: "난이도분포",
} as const;

/** 한줄남기기 시트 — 과목별로 분리해서 보여줍니다 */
export const COMMENT_COLS = {
  createdAt: "작성일시",
  userId: "회원ID",
  subjectCode: "과목코드",
  name: "이름",
  body: "내용",
} as const;

/** setup:sheets 스크립트가 만들어 주는 헤더 순서 (사람이 보기 좋은 기본 순서) */
export const DEFAULT_HEADERS: Record<string, string[]> = {
  [SHEET.subjects]: [
    SUBJECT_COLS.code,
    SUBJECT_COLS.name,
    SUBJECT_COLS.group,
    SUBJECT_COLS.sheetName,
    SUBJECT_COLS.description,
    SUBJECT_COLS.order,
    SUBJECT_COLS.active,
    SUBJECT_COLS.bidirectional,
  ],
  [SHEET.users]: [
    USER_COLS.id,
    USER_COLS.name,
    USER_COLS.pinHash,
    USER_COLS.salt,
    USER_COLS.createdAt,
    USER_COLS.lastSeenAt,
  ],
  [SHEET.progress]: [
    PROGRESS_COLS.userId,
    PROGRESS_COLS.subjectCode,
    PROGRESS_COLS.data,
    PROGRESS_COLS.updatedAt,
  ],
  [SHEET.dailyStats]: [
    DAILY_COLS.userId,
    DAILY_COLS.date,
    DAILY_COLS.subjectCode,
    DAILY_COLS.solved,
    DAILY_COLS.correct,
    DAILY_COLS.wrong,
    DAILY_COLS.seconds,
    DAILY_COLS.levels,
  ],
  [SHEET.comments]: [
    COMMENT_COLS.createdAt,
    COMMENT_COLS.userId,
    COMMENT_COLS.subjectCode,
    COMMENT_COLS.name,
    COMMENT_COLS.body,
  ],
};

/** 문제 시트를 새로 만들 때의 기본 헤더 */
export const QUESTION_SHEET_HEADERS: string[] = [
  QUESTION_COLS.id,
  QUESTION_COLS.text,
  QUESTION_COLS.answer,
  ...OPTION_COLS,
  QUESTION_COLS.explanation,
  QUESTION_COLS.active,
  QUESTION_COLS.open,
];
