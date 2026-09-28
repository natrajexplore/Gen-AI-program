import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { lessonsOf } from "../lib/catalog";
import type { Domain } from "../types";

interface Entry { d: Domain; key?: string; title: string; meta: string; text: string }

export function Search({ domains, onPick }: { domains: Domain[]; onPick: (domainId: string, lessonKey: string | null) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => domains.flatMap((d): Entry[] => [
    { d, title: d.name, meta: "Domain · " + d.layers, text: (d.name + " " + d.tagline + " " + d.proto).toLowerCase() },
    ...lessonsOf(d).map((x) => ({
      d, key: x.key, title: x.lesson.t, meta: d.short + " › " + x.module.title,
      text: (x.lesson.t + " " + x.lesson.body + " " + (x.lesson.points || []).join(" ") + " " + (x.lesson.cli || "")).toLowerCase()
    }))
  ]), [domains]);

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (q.length < 2) return [];
    const terms = q.split(/\s+/);
    return index.filter((it) => terms.every((t) => it.text.includes(t) || it.title.toLowerCase().includes(t))).slice(0, 12);
  }, [index, q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as Element).closest(".search")) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  function pick(h: Entry) {
    setOpen(false);
    setQuery("");
    onPick(h.d.id, h.key ?? null);
  }

  return (
    <div className="search" role="search">
      <label className="sr-only" htmlFor="search-input">Search lessons</label>
      <input
        id="search-input" ref={inputRef} type="search" autoComplete="off" value={query}
        placeholder="Search: OSPF, OMP, EAP-TLS, contracts, Marvis…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
          if (e.key === "Enter" && hits[0]) pick(hits[0]);
        }}
      />
      <div className="search-results" hidden={!open || q.length < 2}>
        {!hits.length && <p className="search-empty">No lessons match "{query.trim()}". Try a protocol name such as BGP or DHCP.</p>}
        {hits.map((h) => (
          <button key={h.key ?? h.d.id} type="button" style={{ "--c": h.d.color } as CSSProperties} onClick={() => pick(h)}>
            <span className="sr-title">{h.title}</span>
            <span className="sr-meta">{h.meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
