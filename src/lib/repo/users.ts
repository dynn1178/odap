import "server-only";
import { hashPin, makeSalt, newUserId, verifyPin } from "@/lib/auth/pin";
import { SHEET, USER_COLS } from "@/lib/sheets/schema";
import { Table } from "@/lib/sheets/table";
import { nowIso } from "@/lib/util/date";

export type UserRow = {
  id: string;
  name: string;
  pinHash: string;
  salt: string;
  createdAt: string;
  rowIndex: number;
};

async function loadUsers(): Promise<{ table: Table; users: UserRow[] }> {
  const table = await Table.load(SHEET.users);
  const users: UserRow[] = [];
  table.rows.forEach((row, i) => {
    const id = table.get(row, USER_COLS.id);
    if (!id) return;
    users.push({
      id,
      name: table.get(row, USER_COLS.name),
      pinHash: table.get(row, USER_COLS.pinHash),
      salt: table.get(row, USER_COLS.salt),
      createdAt: table.opt(row, USER_COLS.createdAt),
      rowIndex: i,
    });
  });
  return { table, users };
}

/** 이름 + PIN 이 모두 맞는 회원 찾기 (로그인) */
export async function authenticate(
  name: string,
  pin: string,
): Promise<{ id: string; name: string } | null> {
  const { table, users } = await loadUsers();
  const candidates = users.filter((u) => u.name === name);

  for (const u of candidates) {
    if (u.pinHash && u.salt && verifyPin(pin, u.salt, u.pinHash)) {
      // 최근접속일시 갱신은 실패해도 로그인을 막지 않습니다.
      try {
        if (table.hasColumn(USER_COLS.lastSeenAt)) {
          await table.writeRow(u.rowIndex, {
            [USER_COLS.id]: u.id,
            [USER_COLS.name]: u.name,
            [USER_COLS.pinHash]: u.pinHash,
            [USER_COLS.salt]: u.salt,
            [USER_COLS.createdAt]: u.createdAt,
            [USER_COLS.lastSeenAt]: nowIso(),
          });
        }
      } catch {
        /* noop */
      }
      return { id: u.id, name: u.name };
    }
  }
  return null;
}

export type SignupResult =
  | { ok: true; user: { id: string; name: string } }
  | { ok: false; reason: "duplicate" };

/**
 * 신규 가입. (이름 + PIN) 조합이 이미 있으면 duplicate 로 돌려보내
 * "이미 사용 중인 이름/번호입니다" 안내 후 재입력을 받게 합니다 (기획안 2-4).
 */
export async function signup(name: string, pin: string): Promise<SignupResult> {
  const { table, users } = await loadUsers();

  const clash = users.some(
    (u) => u.name === name && u.pinHash && u.salt && verifyPin(pin, u.salt, u.pinHash),
  );
  if (clash) return { ok: false, reason: "duplicate" };

  const salt = makeSalt();
  const id = newUserId();
  const now = nowIso();

  await table.appendRow({
    [USER_COLS.id]: id,
    [USER_COLS.name]: name,
    [USER_COLS.pinHash]: hashPin(pin, salt),
    [USER_COLS.salt]: salt,
    [USER_COLS.createdAt]: now,
    [USER_COLS.lastSeenAt]: now,
  });

  return { ok: true, user: { id, name } };
}

/** 랭킹·방문자 집계용 회원 요약 */
export async function listUsersBrief(): Promise<
  { id: string; name: string; createdAt: string }[]
> {
  const { users } = await loadUsers();
  return users.map((u) => ({ id: u.id, name: u.name, createdAt: u.createdAt }));
}
