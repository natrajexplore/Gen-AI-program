import { useEffect, useRef } from "react";
import { createTopologyScene } from "../three/scenes";
import type { Topology } from "../types";

export function TopologyCanvas({ topology, color }: { topology: Topology; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const topo = createTopologyScene(canvasRef.current!, labelsRef.current!, topology, color);
    return () => topo?.dispose();
  }, [topology, color]);

  return (
    <div className="topo-wrap">
      <canvas id="topo-canvas" ref={canvasRef} aria-hidden="true" />
      <div ref={labelsRef} className="label-layer" />
      <span className="topo-hint">Drag to rotate · scroll to zoom</span>
    </div>
  );
}
