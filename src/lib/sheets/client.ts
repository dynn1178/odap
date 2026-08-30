import "server-only";
import { JWT } from "google-auth-library";
import { env } from "@/lib/env";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const API = "https://sheets.googleapis.com/v4/spreadsheets";

let jwtClient: JWT | null = null;

function client(): JWT {
  if (!jwtClient) {
    jwtClient = new JWT({
      email: env.serviceAccountEmail,
      key: env.privateKey,
      scopes: SCOPES,
    });
  }
  return jwtClient;
}

/** google-auth-library 가 토큰 만료를 알아서 관리하므로 그대로 위임합니다. */
async function accessToken(): Promise<string> {
  const { token } = await client().getAccessToken();
  if (!token) throw new Error("Google 액세스 토큰을 발급받지 못했습니다.");
  return token;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${API}/${env.sheetId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403) {
      throw new Error(
        `구글시트 접근 권한이 없습니다. 스프레드시트를 서비스 계정(${env.serviceAccountEmail})에 "편집자"로 공유했는지 확인하세요. (${body})`,
      );
    }
    throw new Error(`Google Sheets API 오류 ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

/** 0-based 열 인덱스 → A1 표기 열 문자 (0 → A, 26 → AA) */
export function colLetter(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode((n % 26) + 65) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** 시트 이름에 따옴표/공백이 있어도 안전하게 A1 range 를 만듭니다. */
export function a1(sheetName: string, range?: string): string {
  const quoted = `'${sheetName.replace(/'/g, "''")}'`;
  return range ? `${quoted}!${range}` : quoted;
}

function enc(range: string): string {
  return encodeURIComponent(range);
}

export type Grid = string[][];

export async function getValues(range: string): Promise<Grid> {
  const data = await call<{ values?: Grid }>(`/values/${enc(range)}`);
  return data.values ?? [];
}

export async function batchGetValues(ranges: string[]): Promise<Grid[]> {
  if (ranges.length === 0) return [];
  const qs = ranges.map((r) => `ranges=${enc(r)}`).join("&");
  const data = await call<{ valueRanges?: { values?: Grid }[] }>(`/values:batchGet?${qs}`);
  return (data.valueRanges ?? []).map((v) => v.values ?? []);
}

export async function updateValues(range: string, values: Grid): Promise<void> {
  await call(`/values/${enc(range)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
}

/** 여러 범위를 1회 호출로 갱신 — 배치 동기화의 핵심 (기획안 3-2 ②) */
export async function batchUpdateValues(
  updates: { range: string; values: Grid }[],
): Promise<void> {
  if (updates.length === 0) return;
  await call(`/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: updates.map((u) => ({ range: u.range, majorDimension: "ROWS", values: u.values })),
    }),
  });
}

export async function appendValues(range: string, values: Grid): Promise<void> {
  await call(
    `/values/${enc(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values }),
    },
  );
}

export async function listSheetTitles(): Promise<string[]> {
  const data = await call<{ sheets?: { properties?: { title?: string } }[] }>(
    `?fields=${enc("sheets.properties.title")}`,
  );
  return (data.sheets ?? []).map((s) => s.properties?.title ?? "").filter(Boolean);
}

export async function addSheet(title: string): Promise<void> {
  await call(`:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
}
