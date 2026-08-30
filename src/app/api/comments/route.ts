import { fail, handle, ok, readJson } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { addComment, listComments, MAX_COMMENT_LEN } from "@/lib/repo/comments";
import { findSubject } from "@/lib/repo/subjects";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireSession();
    const code = new URL(req.url).searchParams.get("subject")?.trim();
    if (!code) return fail("과목 코드가 필요합니다.");
    return ok({ comments: await listComments(code) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const body = await readJson(req);
    const code = String(body.subject ?? "").trim();
    const text = String(body.body ?? "").trim();

    if (!code) return fail("과목 코드가 필요합니다.");
    if (!(await findSubject(code))) return fail("존재하지 않는 과목입니다.", 404);
    if (!text) return fail("내용을 입력해 주세요.");
    if (text.length > MAX_COMMENT_LEN) {
      return fail(`내용은 ${MAX_COMMENT_LEN}자까지 쓸 수 있어요.`);
    }

    await addComment(session.userId, session.name, code, text);
    return ok({ comments: await listComments(code) });
  });
}
