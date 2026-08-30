/**
 * 구글시트 초기 세팅 스크립트
 *   npm run setup:sheets
 *
 * - 필요한 시트가 없으면 만들고, 1행에 한글 헤더를 넣습니다.
 * - 과목목록이 비어 있으면 샘플 과목 + 샘플 문제 시트를 만들어 바로 돌려볼 수 있게 합니다.
 * - 이미 있는 데이터는 건드리지 않습니다.
 *
 * ※ 헤더 문자열은 src/lib/sheets/schema.ts 와 같아야 합니다. 바꿀 때 양쪽을 함께 고치세요.
 */
import { readFileSync } from "node:fs";
import { JWT } from "google-auth-library";

loadEnvFile(".env.local");
loadEnvFile(".env");

const SHEET_ID = need("GOOGLE_SHEET_ID");
const EMAIL = need("GOOGLE_SERVICE_ACCOUNT_EMAIL");
const KEY = need("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");

const HEADERS = {
  과목목록: ["과목코드", "과목명", "상위그룹", "문제시트명", "설명", "노출순서", "사용여부"],
  회원: ["회원ID", "이름", "PIN해시", "솔트", "가입일시", "최근접속일시"],
  진도: ["회원ID", "과목코드", "진도데이터", "갱신일시"],
  일별통계: ["회원ID", "날짜", "과목코드", "푼문제수", "정답수", "오답수", "학습시간초", "난이도분포"],
  한줄남기기: ["작성일시", "회원ID", "과목코드", "이름", "내용"],
};

const QUESTION_HEADERS = [
  "문제ID",
  "문제",
  "정답",
  "보기2",
  "보기3",
  "보기4",
  "보기5",
  "보기6",
  "보기7",
  "해설",
  "사용여부",
];

const SAMPLE_SHEET = "문제_샘플";
const SAMPLE_SUBJECT = ["SAMPLE", "샘플 과목", "", SAMPLE_SHEET, "설치가 잘 됐는지 확인용", "1", "Y"];
const SAMPLE_QUESTIONS = [
  ["S-0001", "‘노크(knock)’의 뜻으로 알맞은 것은?", "문을 두드리다", "문을 열다", "문을 잠그다", "문을 부수다", "", "", "", "오답노크는 오답의 문을 두드린다는 뜻입니다.", "Y"],
  ["S-0002", "간격반복 학습의 핵심 아이디어는?", "잊을 때쯤 다시 본다", "한 번에 몰아서 본다", "어려운 건 건너뛴다", "쉬운 것만 반복한다", "", "", "", "", "Y"],
  ["S-0003", "다음 중 보기 개수가 달라도 되는 것은?", "오답 보기", "정답", "문제 지문", "문제ID", "", "", "", "정답은 항상 1개, 오답 보기 수는 문제마다 달라도 됩니다.", "Y"],
];

const auth = new JWT({
  email: EMAIL,
  key: KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const API = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

async function call(path, init) {
  const { token } = await auth.getAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403) {
      throw new Error(
        `접근 권한이 없습니다. 스프레드시트를 ${EMAIL} 에 "편집자"로 공유했는지 확인하세요.\n${body}`,
      );
    }
    throw new Error(`Sheets API ${res.status}: ${body}`);
  }
  return res.json();
}

async function titles() {
  const data = await call(`?fields=${encodeURIComponent("sheets.properties.title")}`);
  return (data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean);
}

async function addSheet(title) {
  await call(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
}

async function getRange(range) {
  const data = await call(`/values/${encodeURIComponent(range)}`);
  return data.values ?? [];
}

async function setRange(range, values) {
  await call(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
}

async function appendRange(range, values) {
  await call(
    `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values }) },
  );
}

/** 0-based 열 인덱스 → A, B, ... Z, AA */
function colLetter(index) {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

async function ensureSheet(name, headers, existing) {
  if (!existing.includes(name)) {
    await addSheet(name);
    console.log(`  + 시트 생성: ${name}`);
  }
  const first = await getRange(`'${name}'!1:1`);
  const current = (first[0] ?? []).filter(Boolean);
  if (current.length === 0) {
    await setRange(`'${name}'!A1`, [headers]);
    console.log(`  + 헤더 입력: ${name} — ${headers.join(", ")}`);
  } else {
    const missing = headers.filter((h) => !current.includes(h));
    if (missing.length > 0) {
      // 기존 열은 그대로 두고 오른쪽 끝에만 덧붙입니다. 데이터는 건드리지 않습니다.
      const startCol = colLetter(current.length);
      await setRange(`'${name}'!${startCol}1`, [missing]);
      console.log(`  + 컬럼 추가: ${name} — ${missing.join(", ")}`);
    } else {
      console.log(`  · 이미 있음: ${name}`);
    }
  }
}

async function main() {
  console.log(`스프레드시트 ${SHEET_ID} 세팅을 시작합니다.\n`);
  const existing = await titles();

  for (const [name, headers] of Object.entries(HEADERS)) {
    await ensureSheet(name, headers, existing);
  }

  const subjects = await getRange(`'과목목록'!A2:A`);
  if (subjects.length === 0) {
    console.log("\n과목목록이 비어 있어 샘플 과목을 넣습니다.");
    await ensureSheet(SAMPLE_SHEET, QUESTION_HEADERS, await titles());
    const sampleRows = await getRange(`'${SAMPLE_SHEET}'!A2:A`);
    if (sampleRows.length === 0) {
      await appendRange(`'${SAMPLE_SHEET}'!A1`, SAMPLE_QUESTIONS);
      console.log(`  + 샘플 문제 ${SAMPLE_QUESTIONS.length}개 추가`);
    }
    await appendRange(`'과목목록'!A1`, [SAMPLE_SUBJECT]);
    console.log("  + 샘플 과목 추가 (과목코드: SAMPLE)");
  }

  console.log("\n완료했습니다. npm run dev 로 실행해 보세요.");
}

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(
      `환경변수 ${name} 가 없습니다. .env.example 을 복사해 .env.local 을 만들고 값을 채워 주세요.`,
    );
    process.exit(1);
  }
  return v;
}

function loadEnvFile(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (process.env[key]) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

main().catch((e) => {
  console.error(`\n실패했습니다: ${e.message}`);
  process.exit(1);
});
