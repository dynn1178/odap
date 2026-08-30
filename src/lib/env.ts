/** 서버 전용 환경변수 접근. 클라이언트 번들에 절대 포함되면 안 됩니다. */
import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `환경변수 ${name} 가 설정되지 않았습니다. .env.example 을 참고해 .env.local 을 만들어 주세요.`,
    );
  }
  return v;
}

export const env = {
  get serviceAccountEmail() {
    return required("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  },
  /** Vercel 등에서는 줄바꿈이 \n 문자로 들어오므로 실제 개행으로 되돌립니다. */
  get privateKey() {
    return required("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
  },
  get sheetId() {
    return required("GOOGLE_SHEET_ID");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get pinSaltSecret() {
    return required("PIN_SALT_SECRET");
  },
  get cachePurgeToken() {
    return process.env.CACHE_PURGE_TOKEN ?? "";
  },
};
