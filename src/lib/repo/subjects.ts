import "server-only";
import { cached, TTL } from "@/lib/cache";
import type { Subject } from "@/lib/domain/types";
import { Table } from "@/lib/sheets/table";
import { SHEET, SUBJECT_COLS } from "@/lib/sheets/schema";

export const SUBJECTS_CACHE_KEY = "subjects";

export async function listSubjects(): Promise<Subject[]> {
  return cached(SUBJECTS_CACHE_KEY, TTL.subjects, async () => {
    const t = await Table.load(SHEET.subjects);
    const out: Subject[] = [];

    t.rows.forEach((row) => {
      const code = t.get(row, SUBJECT_COLS.code);
      const sheetName = t.get(row, SUBJECT_COLS.sheetName);
      const active = t.opt(row, SUBJECT_COLS.active);
      if (!code || !sheetName) return;
      if (active && active.toUpperCase() !== "Y") return;

      out.push({
        code,
        name: t.get(row, SUBJECT_COLS.name) || code,
        group: t.opt(row, SUBJECT_COLS.group),
        sheetName,
        description: t.opt(row, SUBJECT_COLS.description),
        order: Number(t.opt(row, SUBJECT_COLS.order)) || 0,
      });
    });

    out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ko"));
    return out;
  });
}

export async function findSubject(code: string): Promise<Subject | undefined> {
  const all = await listSubjects();
  return all.find((s) => s.code === code);
}
