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

/**
 * 오타를 재는 단위.
 *
 * 한글은 한 글자에 자음·모음이 뭉쳐 있어서 글자 수로 재면 "베개"와 "베게"가
 * 2글자 중 1글자 차이(=절반)가 되어 오타로 봐줄 수가 없습니다.
 * 자모로 풀면 ㅂㅔㄱㅐ / ㅂㅔㄱㅔ 로 4개 중 1개 차이가 되어 영어와 같은 잣대로 잴 수 있습니다.
 * ("밤"과 "밥"은 자모로 풀어도 3개뿐이라 여전히 다른 단어로 남습니다.)
 */
const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

function toJamo(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < HANGUL_BASE || code > HANGUL_LAST) {
      out += ch;
      continue;
    }
    const index = code - HANGUL_BASE;
    const cho = Math.floor(index / (JUNG_COUNT * JONG_COUNT));
    const jung = Math.floor(index / JONG_COUNT) % JUNG_COUNT;
    const jong = index % JONG_COUNT;
    // 자모를 그대로 쓸 필요는 없고 서로 겹치지 않기만 하면 됩니다.
    out += String.fromCharCode(0x3131 + cho, 0x314f + jung);
    if (jong > 0) out += String.fromCharCode(0x11a7 + jong);
  }
  return out;
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
 * 주관식은 시트의 "정답" 칸에 `,` 또는 `;` 로 여러 정답을 적을 수 있습니다.
 *   예) 마흔, 40  /  eraser; rubber  /  지우개,고무지우개
 * 어느 하나와 맞으면 정답으로 칩니다.
 *
 * 객관식에서는 나누지 않습니다 — 정답 자체가 보기 문구라서
 * "서울, 대한민국" 같은 답이 두 개로 쪼개지면 안 됩니다.
 */
export function acceptedAnswers(answer: string, open: boolean): string[] {
  const text = answer.trim();
  if (!open) return text ? [text] : [];
  return text
    .split(/[,;]/)
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

  const candidates = acceptedAnswers(answer, true);
  if (candidates.some((c) => normalize(c) === typed)) return "correct";
  if (candidates.some((c) => tight(c) === tight(input))) return "correct";

  // 오타 허용은 자모 4개 이상(한글 2음절 / 영문 4글자)일 때만.
  // 더 짧으면 한 글자 차이가 그냥 다른 단어입니다.
  const typedJamo = toJamo(tight(input));
  if (
    typedJamo.length >= 4 &&
    candidates.some((c) => {
      const target = toJamo(tight(c));
      return target.length >= 4 && withinOneEdit(target, typedJamo);
    })
  ) {
    return "typo";
  }
  return "wrong";
}

/** 화면에 보여줄 정답 문구 (주관식이고 여러 개면 " / " 로 잇습니다) */
export function displayAnswer(answer: string, open: boolean): string {
  return acceptedAnswers(answer, open).join(" / ");
}
