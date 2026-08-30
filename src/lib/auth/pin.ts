import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * PIN 은 4자리라 암호학적 강도가 낮습니다. 그래도 시트를 열람하는 사람이
 * 남의 PIN 을 그대로 보는 상황은 막기 위해 평문 대신 해시를 저장합니다.
 *   해시 = sha256(회원별_솔트 + PIN + 서버_시크릿)
 */
export function makeSalt(): string {
  return randomBytes(9).toString("base64url");
}

export function hashPin(pin: string, salt: string): string {
  return createHash("sha256")
    .update(`${salt}:${pin}:${env.pinSaltSecret}`)
    .digest("base64url");
}

export function verifyPin(pin: string, salt: string, expected: string): boolean {
  const actual = hashPin(pin, salt);
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function newUserId(): string {
  return `u_${randomBytes(8).toString("base64url").slice(0, 10)}`;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isValidName(name: string): boolean {
  const n = normalizeName(name);
  return n.length >= 1 && n.length <= 20;
}

/** ── 로그인 시도 제한: 같은 이름으로 5회 실패 시 60초 대기 (기획안 2-4) ── */
const attempts = new Map<string, { count: number; until: number }>();

export function checkThrottle(key: string): { blocked: boolean; retryAfterSec: number } {
  const rec = attempts.get(key);
  if (!rec) return { blocked: false, retryAfterSec: 0 };
  if (rec.until > Date.now()) {
    return { blocked: true, retryAfterSec: Math.ceil((rec.until - Date.now()) / 1000) };
  }
  if (rec.until && rec.until <= Date.now()) attempts.delete(key);
  return { blocked: false, retryAfterSec: 0 };
}

export function recordFailure(key: string): void {
  const rec = attempts.get(key) ?? { count: 0, until: 0 };
  rec.count += 1;
  if (rec.count >= 5) {
    rec.until = Date.now() + 60_000;
    rec.count = 0;
  }
  attempts.set(key, rec);
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}
