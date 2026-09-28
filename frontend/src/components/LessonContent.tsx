import type { Lesson } from "../types";
import { Mermaid } from "./Mermaid";

export function LessonContent({ l }: { l: Lesson }) {
  return (
    <>
      <p>{l.body}</p>
      {l.points?.length > 0 && <ul>{l.points.map((p, i) => <li key={i}>{p}</li>)}</ul>}
      {l.diagram && <Mermaid code={l.diagram} />}
      {l.cli && <div className="cli"><div className="cli-head">example</div><pre>{l.cli}</pre></div>}
    </>
  );
}
