import { useEffect, useRef, type CSSProperties } from "react";
import { domainStats, lessonKey, lessonsOf } from "../lib/catalog";
import { useProgress } from "../lib/progress";
import type { Domain, TopoNode } from "../types";
import { LessonContent } from "./LessonContent";
import { Quiz } from "./Quiz";
import { Stats } from "./Stats";
import { TopologyCanvas } from "./TopologyCanvas";

interface Props {
  d: Domain;
  openLesson: string | null;
  onLessonOpened: () => void;
  onHome: (e: React.MouseEvent) => void;
  onAskAboutNode: (node: TopoNode) => void;
}

export function DomainView({ d, openLesson, onLessonOpened, onHome, onAskAboutNode }: Props) {
  const { progress, toggleLesson } = useProgress();
  useEffect(() => { document.title = d.name + " · NetVerse Academy"; }, [d]);

  // A new domain starts at the top, unless a lesson picked from search is about to be opened.
  const openLessonRef = useRef(openLesson);
  useEffect(() => { openLessonRef.current = openLesson; });
  useEffect(() => { if (!openLessonRef.current) window.scrollTo(0, 0); }, [d]);

  useEffect(() => {
    if (!openLesson) return;
    const det = document.getElementById("lesson-" + openLesson.split(":").join("-")) as HTMLDetailsElement | null;
    onLessonOpened();
    if (det) { det.open = true; setTimeout(() => det.scrollIntoView({ block: "center" }), 50); }
  }, [openLesson, onLessonOpened]);

  const total = lessonsOf(d).length;

  return (
    <div id="view-domain" style={{ "--c": d.color } as CSSProperties}>
      <section className="domain-hero">
        <a href="#" className="back" onClick={onHome}>← All domains</a>
        <div className="dh-grid">
          <div className="dh-copy">
            <p className="eyebrow">{d.layers + " · " + d.proto + " · " + d.level + (d.deep ? " · Deep dive" : "")}</p>
            <h1>{d.name}</h1>
            <p className="lede">{d.tagline}</p>
            <Stats pairs={[
              ["modules", String(d.modules.length)],
              ["lessons", String(total)],
              ["quiz", d.quiz.length + " Qs"],
              ["study time", "~" + d.hours + " h"]
            ]} />
          </div>
          <TopologyCanvas topology={d.topology} color={d.color} onNodeClick={onAskAboutNode} />
        </div>
      </section>
      <section className="section domain-body">
        <div className="modules">
          {d.modules.map((m, mi) => (
            <section key={mi} className="module">
              <div className="module-head">
                <span className="idx">M{mi + 1}</span>
                <h2>{m.title}</h2>
              </div>
              {m.lessons.map((l, li) => {
                const key = lessonKey(d, mi, li);
                const done = !!progress.done[key];
                return (
                  <details key={li} id={"lesson-" + d.id + "-" + mi + "-" + li} className={"lesson" + (done ? " is-done" : "")}>
                    <summary><span className="check" /><span>{l.t}</span></summary>
                    <div className="lesson-body">
                      <LessonContent l={l} />
                      <button type="button" className="btn btn-ghost" onClick={() => toggleLesson(key)}>
                        {done ? "Mark as not done" : "Mark lesson complete"}
                      </button>
                    </div>
                  </details>
                );
              })}
            </section>
          ))}
        </div>
        <aside className="side">
          <ProgressRing d={d} />
          <Quiz key={d.id} d={d} />
        </aside>
      </section>
    </div>
  );
}

function ProgressRing({ d }: { d: Domain }) {
  const { progress } = useProgress();
  const s = domainStats(d, progress);
  const r = 32, circ = 2 * Math.PI * r, pct = Math.round(s.pct * 100);
  const best = progress.quiz[d.id];
  return (
    <div className="panel">
      <h3>Your progress</h3>
      <div className="ring-row">
        <svg className="ring" viewBox="0 0 76 76" role="img" aria-label={pct + "% complete"}>
          <circle className="track" cx="38" cy="38" r={r} />
          <circle className="fill" cx="38" cy="38" r={r} strokeDasharray={circ.toFixed(1)} strokeDashoffset={(circ * (1 - s.pct)).toFixed(1)} />
          <text x="38" y="38">{pct}%</text>
        </svg>
        <div className="ring-copy">
          <strong>{s.done} of {s.total}</strong> lessons done.<br />
          {best != null ? <>Best quiz score: <strong>{best}/{d.quiz.length}</strong></> : "Quiz not attempted yet."}
        </div>
      </div>
    </div>
  );
}
