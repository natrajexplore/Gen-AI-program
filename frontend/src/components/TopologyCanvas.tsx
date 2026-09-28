import { useEffect, useRef } from "react";
import { createTopologyScene } from "../three/scenes";
import type { TopoNode, Topology } from "../types";

interface Props { topology: Topology; color: string; onNodeClick?: (node: TopoNode) => void }

export function TopologyCanvas({ topology, color, onNodeClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  // Latest handler without rebuilding the scene on every render.
  const clickRef = useRef(onNodeClick);
  useEffect(() => { clickRef.current = onNodeClick; });
  const clickable = !!onNodeClick;

  useEffect(() => {
    const topo = createTopologyScene(canvasRef.current!, labelsRef.current!, topology, color,
      clickable ? (n) => clickRef.current?.(n) : undefined);
    return () => topo?.dispose();
  }, [topology, color, clickable]);

  return (
    <div className="topo-wrap">
      <canvas id="topo-canvas" ref={canvasRef} aria-hidden="true" />
      <div ref={labelsRef} className="label-layer" />
      <span className="topo-hint">Drag to rotate · scroll to zoom{clickable ? " · click a device to ask the tutor" : ""}</span>
    </div>
  );
}
