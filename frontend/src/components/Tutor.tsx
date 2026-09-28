import { Fragment, useEffect, useRef, useState } from "react";
import type { Domain } from "../types";

interface Source { n: number; key: string; domain_id: string; domain: string; module: string; title: string }
interface Msg { role: "user" | "assistant"; content: string; sources?: Source[]; error?: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: Domain | null;              // page the learner is on, used to focus retrieval
  question: string | null;            // a question pushed from elsewhere, e.g. a 3D device click
  onQuestionTaken: () => void;
  onOpenLesson: (domainId: string, lessonKey: string) => void;
}

/* Streams one answer from /api/tutor (server-sent events over a POST). */
async function streamAnswer(messages: Msg[], domainId: string | null, on: (event: string, data: unknown) => void) {
  const r = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain_id: domainId, messages: messages.map(({ role, content }) => ({ role, content })) })
  });
  if (!r.ok || !r.body) {
    const body = await r.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "HTTP " + r.status);
  }
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let cut;
    while ((cut = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, cut);
      buf = buf.slice(cut + 2);
      const event = /^event: (.*)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (event && data) on(event, JSON.parse(data));
    }
  }
}

export function Tutor({ open, onOpenChange, domain, question, onQuestionTaken, onOpenLesson }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history: Msg[] = [...messages.filter((m) => !m.error), { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const patch = (f: (m: Msg) => Msg) => setMessages((ms) => [...ms.slice(0, -1), f(ms[ms.length - 1])]);
    try {
      await streamAnswer(history, domain?.id ?? null, (event, data) => {
        if (event === "sources") patch((m) => ({ ...m, sources: data as Source[] }));
        if (event === "delta") patch((m) => ({ ...m, content: m.content + (data as string) }));
        if (event === "error") patch((m) => ({ ...m, error: data as string }));
      });
    } catch (e) {
      patch((m) => ({ ...m, error: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  }

  // A question pushed from a 3D device click: open and ask it.
  useEffect(() => {
    if (!question || busy) return;
    onQuestionTaken();
    ask(question);
  }, [question, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [messages]);

  if (!open) {
    return <button type="button" className="tutor-fab" onClick={() => onOpenChange(true)}>Ask the tutor</button>;
  }

  return (
    <aside className="tutor" aria-label="AI tutor" onKeyDown={(e) => { if (e.key === "Escape") onOpenChange(false); }}>
      <div className="tutor-head">
        <div>
          <h3>AI tutor</h3>
          <small>{domain ? "Focused on " + domain.short : "All domains"} · cites your lessons</small>
        </div>
        <div className="tutor-actions">
          {messages.length > 0 && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setMessages([])}>Clear</button>}
          <button type="button" className="btn btn-ghost" aria-label="Close tutor" onClick={() => onOpenChange(false)}>✕</button>
        </div>
      </div>

      <div className="tutor-log" ref={logRef} aria-live="polite">
        {!messages.length && (
          <div className="tutor-empty">
            <p>Ask anything about networking. The tutor answers from the course lessons and links to them.</p>
            {domain && <p>Tip: click a device in the 3D topology to ask what it does.</p>}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"tmsg " + m.role}>
            {m.role === "user" ? <p>{m.content}</p> : (
              <>
                {m.content ? <Answer text={m.content} sources={m.sources ?? []} onOpenLesson={onOpenLesson} />
                  : !m.error && <p className="tutor-typing">Thinking…</p>}
                {m.error && <p className="lab-error">{m.error}</p>}
                <Cited m={m} onOpenLesson={onOpenLesson} />
              </>
            )}
          </div>
        ))}
      </div>

      <form className="tutor-form" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <label className="sr-only" htmlFor="tutor-input">Your question</label>
        <textarea id="tutor-input" ref={inputRef} rows={2} value={input} maxLength={4000}
          placeholder={domain ? `Ask about ${domain.short}…` : "Ask about any networking topic…"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }} />
        <button type="submit" className="btn" disabled={busy || !input.trim()}>{busy ? "…" : "Ask"}</button>
      </form>
    </aside>
  );
}

/* Plain text with ``` code blocks and **bold**; [n] citations become links to the cited lesson. */
function Answer({ text, sources, onOpenLesson }: { text: string; sources: Source[]; onOpenLesson: Props["onOpenLesson"] }) {
  const parts = text.split(/```[a-zA-Z0-9-]*\n?/);
  return (
    <>
      {parts.map((part, i) => i % 2 ? (
        <div key={i} className="cli"><pre>{part.replace(/\n$/, "")}</pre></div>
      ) : part.split(/\n{2,}/).filter((p) => p.trim()).map((para, j) => (
        <p key={i + "-" + j}>
          {para.split(/(\[\d+\]|\*\*[^*\n]+\*\*)/).map((bit, k) => {
            if (bit.startsWith("**") && bit.endsWith("**") && bit.length > 4) return <b key={k}>{bit.slice(2, -2)}</b>;
            const src = /^\[(\d+)\]$/.test(bit) ? sources.find((s) => "[" + s.n + "]" === bit) : undefined;
            return src ? (
              <button key={k} type="button" className="cite" title={src.domain + " › " + src.title}
                onClick={() => onOpenLesson(src.domain_id, src.key)}>{bit}</button>
            ) : <Fragment key={k}>{bit}</Fragment>;
          })}
        </p>
      )))}
    </>
  );
}

/* The sources the answer actually cited. */
function Cited({ m, onOpenLesson }: { m: Msg; onOpenLesson: Props["onOpenLesson"] }) {
  const used = (m.sources ?? []).filter((s) => m.content.includes("[" + s.n + "]"));
  if (!used.length) return null;
  return (
    <ol className="tutor-sources">
      {used.map((s) => (
        <li key={s.n} value={s.n}>
          <button type="button" onClick={() => onOpenLesson(s.domain_id, s.key)}>{s.domain} › {s.title}</button>
        </li>
      ))}
    </ol>
  );
}
