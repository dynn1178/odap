/**
 * 주관식 채점.
 *
 * 사람이 손으로 친 답을 글자 그대로 비교하면 대소문자·공백·마침표 때문에
 * 아는 문제도 틀린 것으로 나옵니다. 아는지 모르는지를 보려는 거지 타자 실력을
 * 보려는 게 아니라서, 의미가 같으면 맞은 것으로 봅니다.
 */

/** 비교용으로 다듬기: 소문자 · 공백 정리 · 앞뒤 문장부호 제거 */
export function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s.,!?;:'"()[\]]+|[\s.,!?;:'"()[\]]+$/g, "");
}

/** 공백까지 지운 형태 — "아이스크림" 과 "아이스 크림" 을 같게 봅니다 */
function tight(input: string): string {
  return normalize(input).replace(/\s/g, "");
}

/** 한 글자 차이까지 (편집 거리 1) */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (short.length === long.length) i += 1; // 치환
    j += 1; // 삽입/치환 모두 긴 쪽을 한 칸 넘김
  }
  return edits + (long.length - j) + (short.length - i) <= 1;
}

export type OpenVerdict = "correct" | "typo" | "wrong";

/**
 * 시트의 "정답" 칸에 `;` 로 여러 정답을 적을 수 있습니다.
 *   예) 마흔;40  /  eraser;rubber
 */
export function acceptedAnswers(answer: string): string[] {
  return answer
    .split(";")
    .map((a) => a.trim())
    .filter(Boolean);
}

/**
 * "typo" 는 정답으로 칩니다 — 다만 화면에서 "오타는 넘어갈게요" 라고 알려 줍니다.
 * 오타 허용은 4글자 이상일 때만 적용합니다. 짧은 단어에서 한 글자는 다른 단어입니다.
 */
export function gradeOpen(input: string, answer: string): OpenVerdict {
  const typed = normalize(input);
  if (!typed) return "wrong";

  const candidates = acceptedAnswers(answer);
  if (candidates.some((c) => normalize(c) === typed)) return "correct";
  if (candidates.some((c) => tight(c) === tight(input))) return "correct";

  const typedTight = tight(input);
  if (
    typedTight.length >= 4 &&
    candidates.some((c) => tight(c).length >= 4 && withinOneEdit(tight(c), typedTight))
  ) {
    return "typo";
  }
  return "wrong";
}

/** 화면에 보여줄 정답 문구 (여러 개면 " / " 로 잇습니다) */
export function displayAnswer(answer: string): string {
  return acceptedAnswers(answer).join(" / ");
}
