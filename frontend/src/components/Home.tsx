import { useEffect, useRef, useState, type CSSProperties } from "react";
import { domainStats, lessonsOf } from "../lib/catalog";
import { useProgress } from "../lib/progress";
import { createHeroScene, type SceneHandle } from "../three/scenes";
import type { Catalog, Domain } from "../types";
import { Search } from "./Search";
import { Stats } from "./Stats";
import { SubnetLab } from "./SubnetLab";

type Level = "all" | "deep" | Domain["level"];
const LEVELS: [Level, string][] = [["all", "All"], ["Beginner", "Beginner"], ["Intermediate", "Intermediate"], ["Advanced", "Advanced"], ["deep", "Deep dives"]];

interface Props {
  catalog: Catalog;
  active: boolean;
  onOpen: (domainId: string, lessonKey: string | null) => void;
}

export function Home({ catalog, active, onOpen }: Props) {
  const { domains, paths } = catalog;
  const { progress } = useProgress();
  const [level, setLevel] = useState<Level>("all");
  const [hovered, setHovered] = useState<Domain | null>(null);
  const [noWebgl, setNoWebgl] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<SceneHandle | null>(null);
  const onOpenRef = useRef(onOpen);
  useEffect(() => { onOpenRef.current = onOpen; });

  const totalLessons = domains.reduce((n, d) => n + lessonsOf(d).length, 0);
  const totalQuiz = domains.reduce((n, d) => n + d.quiz.length, 0);
  const byId = Object.fromEntries(domains.map((d) => [d.id, d]));

  // The hero map starts the first time home is shown and lives until unmount,
  // except that it is rebuilt when the domain list changes (a draft was published).
  const heroDomainsRef = useRef<Domain[] | null>(null);
  useEffect(() => {
    if (!active || (heroRef.current && heroDomainsRef.current === domains)) return;
    heroRef.current?.dispose();
    heroDomainsRef.current = domains;
    heroRef.current = createHeroScene(canvasRef.current!, labelsRef.current!, domains, {
      onHover: setHovered,
      onSelect: (d) => onOpenRef.current(d.id, null)
    });
    if (!heroRef.current) setNoWebgl(true);
  }, [active, domains]);
  useEffect(() => () => { heroRef.current?.dispose(); heroRef.current = null; }, []);

  return (
    <div id="view-home" hidden={!active}>
      <section className="hero" aria-label="Networking domains in 3D">
        <canvas id="hero-canvas" ref={canvasRef} aria-hidden="true" />
        <div id="hero-labels" ref={labelsRef} className="label-layer" />
        <div className="hero-copy">
          <p className="eyebrow">All-in-one networking academy</p>
          <h1>Learn every layer of the network.</h1>
          <p className="lede">Nineteen domains on one map, from the OSI model to BGP and Wi-Fi 7, plus deep dives into PKI, post-quantum cryptography, Cisco&nbsp;ISE, ACI, SD-WAN and Juniper&nbsp;Mist. Drag to spin the map, and click any node to start learning.</p>
          <Search domains={domains} onPick={onOpen} />
          <Stats id="stats" pairs={[
            ["domains", String(domains.length)],
            ["lessons", String(totalLessons)],
            ["quiz questions", String(totalQuiz)],
            ["learning paths", String(paths.length)]
          ]} />
        </div>
        <aside className="readout" aria-live="polite">
          <div className="readout-head">show domain brief</div>
          <Readout d={hovered} domains={domains.length} lessons={totalLessons} quiz={totalQuiz} />
        </aside>
        <p className="no-webgl" hidden={!noWebgl}>Your browser has 3D (WebGL) turned off, so the map can't be shown. Every domain is still listed below.</p>
      </section>

      <section className="section" id="domains">
        <div className="section-head">
          <h2>Domains</h2>
          <div className="filters" role="group" aria-label="Filter by level">
            {LEVELS.map(([v, label]) => (
              <button key={v} type="button" className={"chip" + (level === v ? " is-on" : "")} onClick={() => setLevel(v)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="domain-grid">
          {domains.filter((d) => (level === "deep" ? d.deep : level === "all" || d.level === level)).map((d) => {
            const s = domainStats(d, progress);
            return (
              <a key={d.id} className="tile" href={"#" + d.id} style={{ "--c": d.color } as CSSProperties}>
                <div className="tile-top">
                  <span className="port" />
                  <span>{d.layers + " · " + d.proto}</span>
                  {d.deep && <span className="deep-badge">Deep dive</span>}
                  <span className="lvl">{d.level}</span>
                </div>
                <h3>{d.name}</h3>
                <p>{d.tagline}</p>
                <div className="tile-meta">{d.modules.length + " modules · " + s.total + " lessons · ~" + d.hours + " h" + (s.done ? " · " + s.done + " done" : "")}</div>
                <div className="bar"><i style={{ width: (s.pct * 100).toFixed(0) + "%" }} /></div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="section" id="paths">
        <div className="section-head">
          <h2>Learning paths</h2>
          <p className="section-note">Suggested order for each career track. Steps you've fully completed light up.</p>
        </div>
        <div className="paths">
          {paths.map((p) => (
            <div key={p.name} className="path">
              <div>
                <h3>{p.name}</h3>
                <small>{p.note + " · " + p.steps.length + " steps"}</small>
              </div>
              <ol className="steps">
                {p.steps.map((id, i) => {
                  const d = byId[id];
                  return (
                    <li key={id}>
                      <a className={"step" + (domainStats(d, progress).pct === 1 ? " done" : "")} href={"#" + id} style={{ "--c": d.color } as CSSProperties}>
                        <span className="n">{String(i + 1).padStart(2, "0")}</span>{d.short}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="lab">
        <div className="section-head">
          <h2>Subnet Lab</h2>
          <p className="section-note">Enter an IPv4 address with a prefix length to see every detail of its subnet.</p>
        </div>
        <SubnetLab />
      </section>
    </div>
  );
}

function Readout({ d, domains, lessons, quiz }: { d: Domain | null; domains: number; lessons: number; quiz: number }) {
  const { progress } = useProgress();
  if (!d) {
    return (
      <pre>{"Hover over a node to see its brief.\nClick a node to open its lessons.\n\n"}<b>{domains + " domains"}</b>{" up · " + lessons + " lessons · " + quiz + " quiz questions"}</pre>
    );
  }
  const s = domainStats(d, progress);
  const lines: [string, string][] = [
    ["domain   ", d.name],
    ["layers   ", d.layers + "  (" + d.proto + ")"],
    ["level    ", d.level + " · ~" + d.hours + " h"],
    ["modules  ", d.modules.length + " · lessons " + s.total],
    ["progress ", Math.round(s.pct * 100) + "% complete"]
  ];
  return <pre>{lines.map(([k, v], i) => <span key={k}>{k}<b>{v}</b>{i < lines.length - 1 && "\n"}</span>)}</pre>;
}
