/* NetVerse 3D scenes, ported from the original js/scene.js (Three.js r128) to modern three.
   - createHeroScene: the domain constellation on the home page
   - createTopologyScene: a per-domain network topology */
import * as THREE from "three";
import type { Domain, Topology } from "../types";

// Reproduce r128 rendering: no colour management, linear output, legacy-style light units.
THREE.ColorManagement.enabled = false;
const LIGHT_SCALE = Math.PI;

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function webglOK(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

export interface SceneHandle { dispose: () => void }

type Tick = (dt: number, t: number) => void;
type Seg = [THREE.Vector3, THREE.Vector3, string?];

/* Soft round glow used for packets, halos and stars. */
let glowTex: THREE.CanvasTexture | null = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const s = 64, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

function sprite(color: THREE.ColorRepresentation, size: number, opacity?: number) {
  const m = new THREE.SpriteMaterial({
    map: glowTexture(), color: new THREE.Color(color), transparent: true,
    opacity: opacity ?? 1, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}

function starfield(count: number, radius: number, color: number) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * (0.55 + Math.random() * 0.45);
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false
  }));
}

function lights(scene: THREE.Scene, ambient: number, keyIntensity: number, keyDistance: number, keyPos: [number, number, number]) {
  scene.add(new THREE.AmbientLight(0x8899cc, ambient * LIGHT_SCALE));
  const key = new THREE.PointLight(0xffffff, keyIntensity * LIGHT_SCALE, keyDistance, 0);
  key.position.set(...keyPos);
  scene.add(key);
}

/* Tracks listeners so dispose() can remove every one of them. */
function listeners() {
  const offs: (() => void)[] = [];
  return {
    on<K extends keyof HTMLElementEventMap>(t: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) {
      t.addEventListener(type, fn as EventListener, opts);
      offs.push(() => t.removeEventListener(type, fn as EventListener));
    },
    off() { offs.forEach((f) => f()); offs.length = 0; }
  };
}

/* Minimal orbit: drag to rotate a pivot group, wheel/pinch to zoom, gentle auto-spin. */
function orbit(canvas: HTMLCanvasElement, pivot: THREE.Group, camera: THREE.PerspectiveCamera,
  opts: { zoom: boolean; minZ?: number; maxZ?: number; spin?: number }) {
  const state = { dragging: false, x: 0, y: 0, vy: 0, vx: 0, moved: 0, idle: 0 };
  const ev = listeners();
  ev.on(canvas, "pointerdown", (e) => {
    state.dragging = true; state.moved = 0;
    state.x = e.clientX; state.y = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  ev.on(window, "pointermove", (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - state.x, dy = e.clientY - state.y;
    state.x = e.clientX; state.y = e.clientY;
    state.moved += Math.abs(dx) + Math.abs(dy);
    state.vy = dx * 0.005; state.vx = dy * 0.004;
    pivot.rotation.y += state.vy;
    pivot.rotation.x = Math.max(-0.9, Math.min(0.9, pivot.rotation.x + state.vx));
    state.idle = 0;
  });
  ev.on(window, "pointerup", () => { state.dragging = false; });
  ev.on(canvas, "wheel", (e) => {
    if (!opts.zoom) return;
    e.preventDefault();
    camera.position.z = Math.max(opts.minZ!, Math.min(opts.maxZ!, camera.position.z + e.deltaY * 0.01));
  }, { passive: false });
  return {
    state,
    tick(dt: number) {
      if (!state.dragging) {
        state.vy *= 0.94; state.vx *= 0.9;
        pivot.rotation.y += state.vy;
        state.idle += dt;
        if (!reduceMotion && state.idle > 1.2) pivot.rotation.y += dt * (opts.spin || 0.06);
      }
    },
    dispose: ev.off
  };
}

/* Shared renderer loop with resize + visibility pause. */
function stage(canvas: HTMLCanvasElement, fov: number, onResize?: (w: number, h: number, cam: THREE.PerspectiveCamera) => void) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  let visible = true, raf = 0, last = performance.now(), disposed = false;
  const hooks: Tick[] = [];

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    onResize?.(w, h, camera);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible && !raf && !disposed) loop();
  });
  io.observe(canvas);

  function loop() {
    raf = 0;
    if (!visible || disposed) return;
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const h of hooks) h(dt, now / 1000);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  resize();

  return {
    renderer, scene, camera,
    onFrame(fn: Tick) { hooks.push(fn); },
    start() { last = performance.now(); loop(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf); raf = 0; visible = false;
      ro.disconnect(); io.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      });
      renderer.dispose();
    }
  };
}

/* Packets travelling along a list of [Vector3, Vector3] segments. */
function packetSystem(parent: THREE.Object3D, segments: Seg[], colorFn: (s: Seg) => THREE.ColorRepresentation, count: number, speed: number) {
  if (!segments.length) return { tick() {} };
  const pick = () => segments[Math.floor(Math.random() * segments.length)];
  const packets = Array.from({ length: count }, () => {
    const seg = pick();
    const s = sprite(colorFn(seg), 0.32, 0.95);
    parent.add(s);
    return { s, seg, t: Math.random(), v: speed * (0.6 + Math.random() * 0.8), dir: Math.random() < 0.5 ? 1 : -1 };
  });
  return {
    tick(dt: number) {
      if (reduceMotion) return;
      for (const p of packets) {
        p.t += dt * p.v;
        if (p.t >= 1) {
          p.t = 0;
          p.seg = pick();
          p.dir = Math.random() < 0.5 ? 1 : -1;
          p.s.material.color.set(colorFn(p.seg));
        }
        const a = p.dir > 0 ? p.seg[0] : p.seg[1], b = p.dir > 0 ? p.seg[1] : p.seg[0];
        p.s.position.lerpVectors(a, b, p.t);
      }
    }
  };
}

function lineBetween(a: THREE.Vector3, b: THREE.Vector3, color: THREE.ColorRepresentation, opacity: number, dashed?: boolean) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.18, gapSize: 0.12 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const l = new THREE.Line(geo, mat);
  if (dashed) l.computeLineDistances();
  return l;
}

/* ---------------------------------------------------------------- HERO */
export function createHeroScene(canvas: HTMLCanvasElement, labelLayer: HTMLElement, domains: Domain[],
  handlers: { onHover?: (d: Domain | null) => void; onSelect: (d: Domain) => void }): SceneHandle | null {
  if (!webglOK()) return null;
  // On wide screens push the map right so the headline has room; on tall screens pull back.
  const st = stage(canvas, 45, (w, h, cam) => {
    const aspect = w / h;
    cam.position.z = aspect < 1.1 ? 16 + (1.1 - aspect) * 12 : 17.5;
    if (w > 900) cam.setViewOffset(w, h, -w * 0.23, 0, w, h);
    else cam.clearViewOffset();
  });
  const { scene, camera } = st;
  camera.position.y = 0.6;
  const ev = listeners();

  const pivot = new THREE.Group();
  pivot.rotation.x = 0.28;
  scene.add(pivot);
  scene.add(starfield(900, 45, 0x8fa4d8));
  lights(scene, 0.55, 1.2, 60, [6, 8, 10]);

  /* Core: the backbone. */
  const core = new THREE.Group();
  const coreSolid = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 1),
    new THREE.MeshStandardMaterial({ color: 0x1a2a4a, emissive: 0x16345f, roughness: 0.4, metalness: 0.6, flatShading: true })
  );
  const coreWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.55, 1),
    new THREE.MeshBasicMaterial({ color: 0xf5b83d, wireframe: true, transparent: true, opacity: 0.35 })
  );
  core.add(coreSolid, coreWire, sprite("#f5b83d", 4.2, 0.35));
  pivot.add(core);

  /* Orbit rings. */
  [4.6, 6.2].forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.008, 6, 160),
      new THREE.MeshBasicMaterial({ color: 0x5b6f9c, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2 + (i ? 0.22 : -0.12);
    pivot.add(ring);
  });

  /* Domain nodes on two tilted rings. */
  type HeroNode = { d: Domain; g: THREE.Group; body: THREE.Mesh; halo: THREE.Sprite; label: HTMLButtonElement; base: THREE.Vector3; phase: number };
  const nodes: HeroNode[] = [], meshes: THREE.Mesh[] = [], segments: Seg[] = [];
  const inner = Math.ceil(domains.length / 2);
  let hover = -1;

  function setHover(i: number) {
    if (hover === i) return;
    hover = i;
    nodes.forEach((n, k) => n.label.classList.toggle("is-hot", k === i));
    canvas.style.cursor = i >= 0 ? "pointer" : "grab";
    handlers.onHover?.(i >= 0 ? nodes[i].d : null);
  }

  domains.forEach((d, i) => {
    const onInner = i < inner;
    const n = onInner ? inner : domains.length - inner;
    const k = onInner ? i : i - inner;
    const r = onInner ? 4.6 : 6.2;
    const tilt = onInner ? -0.12 : 0.22;
    const a = (k / n) * Math.PI * 2 + (onInner ? 0 : Math.PI / n);
    const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    p.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);

    const col = new THREE.Color(d.color);
    const g = new THREE.Group();
    g.position.copy(p);
    const body = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34, 0),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.4, flatShading: true })
    );
    body.userData.index = i;
    const halo = sprite(d.color, 1.6, 0.45);
    g.add(body, halo);
    pivot.add(g);

    pivot.add(lineBetween(new THREE.Vector3(), p, col, 0.28));
    segments.push([new THREE.Vector3(), p.clone(), d.color]);

    const label = document.createElement("button");
    label.type = "button";
    label.className = "node-label";
    label.style.setProperty("--c", d.color);
    label.innerHTML = '<span class="nl-name"></span><span class="nl-meta"></span>';
    label.querySelector(".nl-name")!.textContent = d.short;
    label.querySelector(".nl-meta")!.textContent = d.layers + " · " + d.proto;
    label.addEventListener("click", () => handlers.onSelect(d));
    label.addEventListener("mouseenter", () => setHover(i));
    label.addEventListener("mouseleave", () => setHover(-1));
    labelLayer.appendChild(label);

    nodes.push({ d, g, body, halo, label, base: p.clone(), phase: Math.random() * 6 });
    meshes.push(body);
  });

  /* Peer links between neighbouring domains, for a meshier look. */
  const outer = nodes.length - inner;
  function peer(i: number, j: number, opacity: number) {
    const a = nodes[i].base, b = nodes[j].base;
    pivot.add(lineBetween(a, b, 0x3c4d75, opacity));
    segments.push([a.clone(), b.clone(), nodes[i].d.color]);
  }
  for (let i = 0; i < inner; i++) peer(i, (i + 1) % inner, 0.35);
  for (let o = 0; o < outer; o++) peer(inner + o, inner + (o + 1) % outer, 0.35);
  for (let x = 0; x < inner; x++) peer(x, inner + (x % outer), 0.22);

  const packets = packetSystem(pivot, segments, (s) => s[2]!, 46, 0.42);
  const ctl = orbit(canvas, pivot, camera, { zoom: false, spin: 0.07 });

  /* Hover + click via raycasting. */
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  function pick(e: MouseEvent) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit ? (hit.object.userData.index as number) : -1;
  }
  ev.on(canvas, "pointermove", (e) => { if (!ctl.state.dragging) setHover(pick(e)); });
  ev.on(canvas, "pointerleave", () => setHover(-1));
  ev.on(canvas, "click", (e) => {
    if (ctl.state.moved > 6) return;
    const i = pick(e);
    if (i >= 0) handlers.onSelect(nodes[i].d);
  });

  /* Parallax for the camera. */
  const par = { x: 0, y: 0 };
  ev.on(window, "pointermove", (e) => {
    par.x = e.clientX / window.innerWidth - 0.5;
    par.y = e.clientY / window.innerHeight - 0.5;
  });

  const tmp = new THREE.Vector3();
  st.onFrame((dt, t) => {
    ctl.tick(dt);
    packets.tick(dt);
    if (!reduceMotion) {
      core.rotation.y += dt * 0.25;
      coreWire.rotation.x -= dt * 0.18;
      camera.position.x += (par.x * 1.6 - camera.position.x) * 0.04;
      camera.position.y += (0.6 - par.y * 1.2 - camera.position.y) * 0.04;
    }
    camera.lookAt(0, 0, 0);

    const w = canvas.clientWidth, h = canvas.clientHeight;
    nodes.forEach((n, k) => {
      const hot = k === hover;
      const bob = reduceMotion ? 0 : Math.sin(t * 1.3 + n.phase) * 0.08;
      n.g.position.set(n.base.x, n.base.y + bob, n.base.z);
      n.body.rotation.y += dt * (hot ? 2.2 : 0.6);
      const sc = hot ? 1.45 : 1;
      n.body.scale.lerp(tmp.set(sc, sc, sc), 0.15);
      n.halo.material.opacity += ((hot ? 0.9 : 0.42) - n.halo.material.opacity) * 0.15;

      n.g.getWorldPosition(tmp);
      const depth = tmp.z;
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      n.label.style.transform = "translate(" + x.toFixed(1) + "px," + (y + 16).toFixed(1) + "px) translate(-50%,0)";
      // Fade labels that sit on the far side of the core.
      const front = Math.max(0, Math.min(1, (depth + 6) / 8));
      n.label.style.opacity = hot ? "1" : (0.35 + front * 0.65).toFixed(2);
      n.label.style.zIndex = String(Math.round(front * 100));
    });
  });
  st.start();
  return { dispose() { ev.off(); ctl.dispose(); st.dispose(); labelLayer.innerHTML = ""; } };
}

/* ------------------------------------------------------------ TOPOLOGY */
const KIND_COLORS: Record<string, string> = {
  core: "#F5B83D", router: "#6FA8FF", switch: "#7C8CFF", spine: "#F5B83D", leaf: "#3DDC97",
  server: "#9FB0D6", host: "#9FB0D6", ap: "#4FD1E8", client: "#9FB0D6", dns: "#B889FF",
  fw: "#FF6B7A", cloud: "#62B6FF", hub: "#FF9F5A", branch: "#FFD166", controller: "#E57BD8",
  ca: "#F472B6", ocsp: "#FBCFE8", psn: "#38BDF8", pan: "#7DD3FC", idstore: "#A5B4FC",
  apic: "#14B8A6", epg: "#99F6E4", ai: "#C7D7F5"
};

/* Expanding radio-wave rings around access points. */
function radioWaves(g: THREE.Object3D, color: THREE.Color, ticks: Tick[], positions: THREE.Vector3[]) {
  positions.forEach((p, k) => {
    for (let w = 0; w < 3; w++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.95, 1, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(p);
      g.add(ring);
      const offset = w / 3 + k * 0.13;
      ticks.push((_dt, t) => {
        const f = reduceMotion ? 0.5 : (t * 0.45 + offset) % 1;
        const s = 0.3 + f * 2.2;
        ring.scale.set(s, s, s);
        ring.material.opacity = 0.55 * (1 - f);
      });
    }
  });
}

function deviceMesh(kind: string) {
  const col = new THREE.Color(KIND_COLORS[kind] || "#9FB0D6");
  const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.5 });
  let geo: THREE.BufferGeometry;
  switch (kind) {
    case "router": case "core": geo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 24); break;
    case "switch": case "leaf": case "spine": geo = new THREE.BoxGeometry(0.8, 0.16, 0.4); break;
    case "server": geo = new THREE.BoxGeometry(0.26, 0.5, 0.3); break;
    case "ap": geo = new THREE.CylinderGeometry(0.26, 0.3, 0.08, 24); break;
    case "fw": geo = new THREE.BoxGeometry(0.46, 0.46, 0.14); break;
    case "cloud": case "hub": geo = new THREE.IcosahedronGeometry(0.34, 1); break;
    case "dns": case "controller": geo = new THREE.OctahedronGeometry(0.3, 0); break;
    default: geo = new THREE.SphereGeometry(0.14, 16, 12);
  }
  return new THREE.Mesh(geo, mat);
}

export function createTopologyScene(canvas: HTMLCanvasElement, labelLayer: HTMLElement, topology: Topology, accent: string): SceneHandle | null {
  if (!webglOK()) return null;
  const st = stage(canvas, 45);
  const { scene, camera } = st;
  camera.position.set(0, 1.6, 11);
  lights(scene, 0.6, 1.1, 50, [4, 7, 8]);
  scene.add(starfield(400, 35, 0x6b7fae));

  const pivot = new THREE.Group();
  pivot.rotation.x = 0.12;
  scene.add(pivot);

  const grid = new THREE.GridHelper(14, 28, 0x2c3a60, 0x243152);
  grid.position.y = -2.2;
  const gridMat = grid.material as THREE.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0.25;
  pivot.add(grid);

  const ticks: Tick[] = [];
  const pos = new Map(topology.nodes.map((n) => [n.id, new THREE.Vector3(...n.pos)]));
  const meshes = topology.nodes.map((n) => {
    const m = deviceMesh(n.kind);
    m.position.copy(pos.get(n.id)!);
    pivot.add(m);
    const h = sprite(KIND_COLORS[n.kind] || "#9FB0D6", 0.9, 0.3);
    h.position.copy(m.position);
    pivot.add(h);
    return m;
  });

  // Label only the first node of each distinct label, to keep things readable.
  const seen = new Set<string>();
  const labels: { el: HTMLSpanElement; m: THREE.Mesh }[] = [];
  topology.nodes.forEach((n, i) => {
    if (seen.has(n.label)) return;
    seen.add(n.label);
    const el = document.createElement("span");
    el.className = "topo-label";
    el.textContent = n.label;
    labelLayer.appendChild(el);
    labels.push({ el, m: meshes[i] });
  });

  const segs: Seg[] = [];
  topology.links.forEach((l) => {
    const a = pos.get(l.from)!, b = pos.get(l.to)!, dashed = l.style === "dashed";
    pivot.add(lineBetween(a, b, dashed ? accent : 0x4a5d8a, dashed ? 0.55 : 0.6, dashed));
    segs.push([a, b]);
  });

  const color = new THREE.Color(accent);
  for (const fx of topology.effects ?? []) {
    if (fx.type === "radio") radioWaves(pivot, color, ticks, fx.nodes.map((id) => pos.get(id)!));
    if (fx.type === "shells") {
      fx.radii.forEach((r, i) => {
        pivot.add(new THREE.Mesh(
          new THREE.SphereGeometry(r, 32, 16),
          new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: i ? 0.07 : 0.12 })
        ));
      });
    }
  }

  const packets = packetSystem(pivot, segs, () => accent, Math.min(40, segs.length * 2), 0.7);
  const ctl = orbit(canvas, pivot, camera, { zoom: true, minZ: 6, maxZ: 18, spin: 0.1 });

  const tmp = new THREE.Vector3();
  st.onFrame((dt, t) => {
    ctl.tick(dt);
    packets.tick(dt);
    ticks.forEach((fn) => fn(dt, t));
    meshes.forEach((m, i) => { if (!reduceMotion) m.rotation.y += dt * (0.3 + (i % 3) * 0.1); });
    camera.lookAt(0, 0.2, 0);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    labels.forEach((l) => {
      l.m.getWorldPosition(tmp);
      tmp.project(camera);
      l.el.style.transform = "translate(" + ((tmp.x * 0.5 + 0.5) * w).toFixed(1) + "px," + ((-tmp.y * 0.5 + 0.5) * h - 30).toFixed(1) + "px) translate(-50%,0)";
    });
  });
  st.start();
  return { dispose() { ctl.dispose(); st.dispose(); labelLayer.innerHTML = ""; } };
}
