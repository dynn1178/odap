import "server-only";
import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth/session";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 모든 라우트를 감싸 오류 메시지를 한글로 정리해 내려줍니다. */
export async function handle<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    const data = await fn();
    if (data instanceof Response) return data;
    return ok(data);
  } catch (e) {
    if (e instanceof UnauthorizedError) return fail(e.message, 401);
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    console.error("[odapknock]", e);
    return fail(message, 500);
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
