import { useEffect, useId, useState } from "react";

// Mermaid is large, so it is loaded only when a page actually contains a diagram.
let ready: Promise<typeof import("mermaid").default> | null = null;
function loadMermaid() {
  ready ??= import("mermaid").then(({ default: m }) => {
    m.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
      themeVariables: {
        darkMode: true, background: "#0A0F1C", primaryColor: "#172038", primaryBorderColor: "#F5B83D",
        primaryTextColor: "#E7ECF6", lineColor: "#8D9BBA", secondaryColor: "#10172A", tertiaryColor: "#10172A",
        noteBkgColor: "#172038", noteTextColor: "#E7ECF6", actorBkg: "#172038", actorTextColor: "#E7ECF6", signalColor: "#8D9BBA"
      }
    });
    return m;
  });
  return ready;
}

export function Mermaid({ code }: { code: string }) {
  const id = "mmd-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    loadMermaid()
      .then((m) => m.render(id, code))
      .then(({ svg }) => { if (live) { setSvg(svg); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [id, code]);

  if (failed) {
    return (
      <div className="cli">
        <div className="cli-head">diagram (could not be drawn)</div>
        <pre>{code}</pre>
      </div>
    );
  }
  // securityLevel "strict" makes Mermaid sanitise the SVG it returns.
  return <div className="diagram" aria-label="Diagram" dangerouslySetInnerHTML={{ __html: svg ?? "" }} />;
}
