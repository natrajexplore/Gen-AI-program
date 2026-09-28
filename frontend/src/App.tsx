import { useCallback, useEffect, useState } from "react";
import { DomainView } from "./components/DomainView";
import { Home } from "./components/Home";
import { Studio } from "./components/Studio";
import { domainStats, lessonsOf } from "./lib/catalog";
import { useProgress } from "./lib/progress";
import type { Catalog } from "./types";

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/catalog")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then(setCatalog)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <p className="section">Couldn't load the course catalogue ({error}). Is the API running on port 8005?</p>;
  if (!catalog) return null;
  return <Shell catalog={catalog} reload={load} />;
}

/* Hash routing, same URLs as the original site: #<domain-id> opens a domain, #studio the content studio,
   anything else is home. */
function Shell({ catalog, reload }: { catalog: Catalog; reload: () => void }) {
  const { progress } = useProgress();
  const [hash, setHash] = useState(location.hash);
  const [pendingLesson, setPendingLesson] = useState<string | null>(null);

  const id = hash.replace(/^#/, "");
  const domain = catalog.domains.find((d) => d.id === id) ?? null;
  const studio = id === "studio";

  useEffect(() => {
    const sync = () => setHash(location.hash);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);

  // On home, a section hash such as #lab scrolls to that section.
  useEffect(() => {
    if (domain || studio) return;
    document.title = "NetVerse Academy";
    if (id && document.getElementById(id)) setTimeout(() => document.getElementById(id)?.scrollIntoView(), 30);
  }, [domain, studio, id]);

  function goHome(section: string | null) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      if (location.hash && location.hash !== "#") history.pushState(null, "", location.pathname + location.search);
      setHash(location.hash);
      setTimeout(() => (section ? document.getElementById(section)?.scrollIntoView() : window.scrollTo(0, 0)), 30);
    };
  }

  function open(domainId: string, lessonKey: string | null) {
    setPendingLesson(lessonKey);
    if (location.hash !== "#" + domainId) location.hash = domainId;
  }
  const clearPending = useCallback(() => setPendingLesson(null), []);

  const totalLessons = catalog.domains.reduce((n, d) => n + lessonsOf(d).length, 0);
  const doneLessons = catalog.domains.reduce((n, d) => n + domainStats(d, progress).done, 0);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <a className="brand" href="#" onClick={goHome(null)}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="4" /><circle cx="5" cy="8" r="2.5" /><circle cx="27" cy="8" r="2.5" /><circle cx="5" cy="24" r="2.5" /><circle cx="27" cy="24" r="2.5" /><path d="M16 16 5 8M16 16l11-8M16 16 5 24M16 16l11 8" /></svg>
          <span>NetVerse</span>
        </a>
        <nav className="nav" aria-label="Sections">
          <a href="#" onClick={goHome("domains")}>Domains</a>
          <a href="#" onClick={goHome("paths")}>Paths</a>
          <a href="#" onClick={goHome("lab")}>Subnet Lab</a>
        </nav>
        <div className="progress-chip" title="Lessons completed across all domains">
          <span className="led" /><span>{doneLessons} / {totalLessons} lessons</span>
        </div>
      </header>

      <main id="main">
        <Home catalog={catalog} active={!domain && !studio} onOpen={open} />
        {studio && <Studio catalog={catalog} onPublished={reload} />}
        {domain && <DomainView d={domain} openLesson={pendingLesson} onLessonOpened={clearPending} onHome={goHome(null)} />}
      </main>

      <footer className="foot">
        <p>NetVerse Academy · Progress is saved in this browser only. · <a href="#studio">Content studio</a></p>
      </footer>
    </>
  );
}
