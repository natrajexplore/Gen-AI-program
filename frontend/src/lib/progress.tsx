import { createContext, useContext, useState, type ReactNode } from "react";

/* Same key and shape as the original site, so existing progress carries over. */
const KEY = "netverse-progress-v1";

export interface Progress { done: Record<string, boolean>; quiz: Record<string, number> }

function load(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.done) return { done: saved.done, quiz: saved.quiz || {} };
  } catch { /* storage unavailable: progress lasts for this visit only */ }
  return { done: {}, quiz: {} };
}

interface Ctx {
  progress: Progress;
  toggleLesson: (key: string) => void;
  recordQuiz: (domainId: string, score: number) => void;
}

const ProgressContext = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(load);

  function update(next: Progress) {
    setProgress(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  const toggleLesson = (key: string) => {
    const done = { ...progress.done };
    if (done[key]) delete done[key]; else done[key] = true;
    update({ ...progress, done });
  };
  const recordQuiz = (id: string, score: number) => {
    if (progress.quiz[id] == null || score > progress.quiz[id]) update({ ...progress, quiz: { ...progress.quiz, [id]: score } });
  };

  return <ProgressContext.Provider value={{ progress, toggleLesson, recordQuiz }}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
