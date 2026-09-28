/* Mirrors backend/app/models.py */
export interface Lesson { t: string; body: string; points: string[]; cli?: string; diagram?: string }
export interface Module { title: string; lessons: Lesson[] }
export interface QuizItem { q: string; o: string[]; a: number; why: string }
export interface TopoNode { id: string; kind: string; label: string; pos: [number, number, number] }
export interface TopoLink { from: string; to: string; style: "solid" | "dashed" }
export type TopoEffect = { type: "radio"; nodes: string[] } | { type: "shells"; radii: number[] };
export interface Topology { nodes: TopoNode[]; links: TopoLink[]; effects: TopoEffect[] }
export interface Domain {
  id: string; name: string; short: string; color: string; layers: string; proto: string;
  level: "Beginner" | "Intermediate" | "Advanced"; hours: number; topology: Topology; tagline: string;
  deep: boolean; modules: Module[]; quiz: QuizItem[];
}
export interface Path { name: string; note: string; steps: string[] }
export interface Catalog { domains: Domain[]; paths: Path[] }

/* AI content studio */
export interface ReviewIssue { target: string; location: string; problem: string; fix: string }
export interface DraftResult {
  modules: Module[];
  quiz: QuizItem[];
  review: { approved: boolean; summary: string; issues: ReviewIssue[] };
  meta?: Pick<Domain, "id" | "name" | "short" | "color" | "layers" | "proto" | "level" | "hours" | "tagline">;
  topology?: Topology;
}
export interface DraftSummary {
  id: number; mode: "extend" | "new"; domain_id: string | null; topic: string; focus: string;
  status: "running" | "ready" | "failed" | "published" | "rejected"; log: string[]; error: string | null;
  created_at: string; updated_at: string;
}
export interface Draft extends DraftSummary { result: DraftResult | null }
