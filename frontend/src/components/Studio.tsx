import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { Catalog, Draft, DraftSummary } from "../types";
import { LessonContent } from "./LessonContent";
import { TopologyCanvas } from "./TopologyCanvas";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof body.detail === "string" ? body.detail : "HTTP " + r.status);
  return body as T;
}

const STATUS_COLOR: Record<string, string> = {
  running: "var(--amber)", ready: "#6FA8FF", published: "var(--green)", failed: "var(--red)", rejected: "var(--faint)"
};

/* AI content studio: ask the agent crew for a draft, review it, then publish or reject it. */
export function Studio({ catalog, onPublished }: { catalog: Catalog; onPublished: () => void }) {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [mode, setMode] = useState<"extend" | "new">("extend");
  const [domainId, setDomainId] = useState(catalog.domains[0].id);
  const [topic, setTopic] = useState("");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const list = await api<DraftSummary[]>("/api/drafts");
    setDrafts(list);
    return list;
  }, []);

  const open = useCallback(async (id: number) => setSelected(await api<Draft>("/api/drafts/" + id)), []);

  useEffect(() => { document.title = "Content studio · NetVerse Academy"; refresh().catch((e) => setError(e.message)); }, [refresh]);

  // While a draft is generating, poll every 2 s and keep the open draft's log live.
  const running = drafts.some((d) => d.status === "running");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const list = await refresh().catch(() => null);
      if (list && selected && list.find((d) => d.id === selected.id)?.updated_at !== selected.updated_at) open(selected.id);
    }, 2000);
    return () => clearInterval(t);
  }, [running, refresh, open, selected]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const d = await api<Draft>("/api/drafts", {
        method: "POST",
        body: JSON.stringify(mode === "extend" ? { mode, domain_id: domainId, focus } : { mode, topic, focus })
      });
      await refresh();
      setSelected(d);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(action: "publish" | "reject") {
    if (!selected) return;
    setError(null);
    try {
      setSelected(await api<Draft>(`/api/drafts/${selected.id}/${action}`, { method: "POST" }));
      await refresh();
      if (action === "publish") onPublished();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const domainName = (id: string | null) => catalog.domains.find((d) => d.id === id)?.name ?? id;
  const title = (d: DraftSummary) => (d.mode === "extend" ? "Extend " + domainName(d.domain_id) : "New: " + d.topic);

  return (
    <div className="section studio">
      <div className="section-head">
        <div>
          <h2>Content studio</h2>
          <p className="section-note">An AI agent crew researches, writes, diagrams, builds the 3D topology, sets a quiz and reviews its own work. Nothing reaches learners until you publish it.</p>
        </div>
      </div>

      <div className="studio-grid">
        <div className="studio-side">
          <form className="panel studio-form" onSubmit={generate}>
            <h3>New draft</h3>
            <div className="filters" role="group" aria-label="Draft type">
              <button type="button" className={"chip" + (mode === "extend" ? " is-on" : "")} onClick={() => setMode("extend")}>Extend a domain</button>
              <button type="button" className={"chip" + (mode === "new" ? " is-on" : "")} onClick={() => setMode("new")}>New domain</button>
            </div>
            {mode === "extend" ? (
              <label>Domain
                <select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
                  {catalog.domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
            ) : (
              <label>Topic
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. EVPN multihoming" maxLength={200} required />
              </label>
            )}
            <label>Focus <span className="opt-note">(optional)</span>
              <textarea value={focus} onChange={(e) => setFocus(e.target.value)} rows={3} maxLength={500}
                placeholder="e.g. troubleshooting on Junos, aimed at CCNP level" />
            </label>
            <button type="submit" className="btn" disabled={busy || running}>{running ? "Crew is working…" : "Generate draft"}</button>
            <p className="lab-error" hidden={!error}>{error}</p>
          </form>

          <div className="panel">
            <h3>Drafts</h3>
            {!drafts.length && <p className="why">No drafts yet.</p>}
            <ul className="draft-list">
              {drafts.map((d) => (
                <li key={d.id}>
                  <button type="button" className={"draft-row" + (selected?.id === d.id ? " is-on" : "")} onClick={() => open(d.id)}>
                    <span className="draft-title">#{d.id} {title(d)}</span>
                    <span className="draft-status" style={{ "--c": STATUS_COLOR[d.status] } as CSSProperties}>{d.status}</span>
                    <span className="draft-meta">{d.status === "running" ? d.log.at(-1) ?? "Starting…" : new Date(d.updated_at).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="studio-main">
          {selected ? <DraftView d={selected} catalog={catalog} onDecide={decide} /> : (
            <div className="panel"><p className="why">Generate a draft or pick one from the list to review it.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

function DraftView({ d, catalog, onDecide }: { d: Draft; catalog: Catalog; onDecide: (a: "publish" | "reject") => void }) {
  const res = d.result;
  const color = res?.meta?.color ?? catalog.domains.find((x) => x.id === d.domain_id)?.color ?? "#F5B83D";
  return (
    <div className="draft" style={{ "--c": color } as CSSProperties}>
      <div className="panel">
        <h3>Draft #{d.id} · {d.status}</h3>
        {d.focus && <p className="why">Focus: {d.focus}</p>}
        <ol className="draft-log">{d.log.map((l, i) => <li key={i}>{l}</li>)}</ol>
        {d.error && <p className="lab-error">{d.error}</p>}
        {d.status === "ready" && (
          <div className="quiz-actions">
            <button type="button" className="btn" onClick={() => onDecide("publish")}>Publish</button>
            <button type="button" className="btn btn-ghost" onClick={() => onDecide("reject")}>Reject</button>
          </div>
        )}
      </div>

      {res && (
        <>
          <div className={"panel review" + (res.review.approved ? " ok" : "")}>
            <h3>Technical review: {res.review.approved ? "approved" : `${res.review.issues.length} open issue${res.review.issues.length === 1 ? "" : "s"}`}</h3>
            <p className="why">{res.review.summary}</p>
            {res.review.issues.length > 0 && (
              <ul className="issues">
                {res.review.issues.map((i, k) => (
                  <li key={k}><b>{i.target} · {i.location}:</b> {i.problem} <em>Suggested fix: {i.fix}</em></li>
                ))}
              </ul>
            )}
            <p className="why">The reviewer is an AI too. Check facts and CLI yourself before publishing.</p>
          </div>

          {res.meta && res.topology && (
            <div className="panel">
              <h3>{res.meta.name}</h3>
              <p className="why">{res.meta.layers} · {res.meta.proto} · {res.meta.level} · ~{res.meta.hours} h · id <code>{res.meta.id}</code></p>
              <p>{res.meta.tagline}</p>
              <TopologyCanvas topology={res.topology} color={color} />
            </div>
          )}

          {res.modules.map((m, mi) => (
            <section key={mi} className="module">
              <div className="module-head"><span className="idx">New {mi + 1}</span><h2>{m.title}</h2></div>
              {m.lessons.map((l, li) => (
                <details key={li} className="lesson" open>
                  <summary><span className="check" /><span>{l.t}</span></summary>
                  <div className="lesson-body"><LessonContent l={l} /></div>
                </details>
              ))}
            </section>
          ))}

          <div className="panel">
            <h3>Quiz ({res.quiz.length} questions)</h3>
            {res.quiz.map((q, qi) => (
              <div key={qi} className="studio-q">
                <p className="quiz-q">{qi + 1}. {q.q}</p>
                <div className="opts">{q.o.map((o, oi) => <div key={oi} className={"opt" + (oi === q.a ? " right" : "")}>{o}</div>)}</div>
                <p className="why">{q.why}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
