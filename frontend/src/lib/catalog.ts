import type { Domain, Lesson, Module } from "../types";
import type { Progress } from "./progress";

export interface LessonRef { key: string; m: number; l: number; lesson: Lesson; module: Module }

export const lessonKey = (d: Domain, mi: number, li: number) => d.id + ":" + mi + ":" + li;

export function lessonsOf(d: Domain): LessonRef[] {
  return d.modules.flatMap((module, m) =>
    module.lessons.map((lesson, l) => ({ key: lessonKey(d, m, l), m, l, lesson, module })));
}

export function domainStats(d: Domain, progress: Progress) {
  const ls = lessonsOf(d);
  const done = ls.filter((x) => progress.done[x.key]).length;
  return { total: ls.length, done, pct: ls.length ? done / ls.length : 0 };
}
