/* NetVerse 3D scenes (Three.js r128, global THREE).
   - createHeroScene: the domain constellation on the home page
   - createTopologyScene: a per-domain network topology */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function webglOK() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  /* Soft round glow used for packets, halos and stars. */
  var glowTex = null;
  function glowTexture() {
    if (glowTex) return glowTex;
    var s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    var g = c.getContext("2d");
    var grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    glowTex = new THREE.CanvasTexture(c);
    return glowTex;
  }

  function sprite(color, size, opacity) {
    var m = new THREE.SpriteMaterial({
      map: glowTexture(), color: new THREE.Color(color), transparent: true,
      opacity: opacity == null ? 1 : opacity, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    return s;
  }

  function starfield(count, radius, color) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var r = radius * (0.55 + Math.random() * 0.45);
      var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      color: color, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false
    }));
  }

  /* Minimal orbit: drag to rotate a pivot group, wheel/pinch to zoom, gentle auto-spin. */
  function orbit(canvas, pivot, camera, opts) {
    var state = { dragging: false, x: 0, y: 0, vy: 0, vx: 0, moved: 0, idle: 0 };
    var minZ = opts.minZ, maxZ = opts.maxZ;
    function down(e) {
      state.dragging = true; state.moved = 0;
      state.x = e.clientX; state.y = e.clientY;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
    function move(e) {
      if (!state.dragging) return;
      var dx = e.clientX - state.x, dy = e.clientY - state.y;
      state.x = e.clientX; state.y = e.clientY;
      state.moved += Math.abs(dx) + Math.abs(dy);
      state.vy = dx * 0.005; state.vx = dy * 0.004;
      pivot.rotation.y += state.vy;
      pivot.rotation.x = Math.max(-0.9, Math.min(0.9, pivot.rotation.x + state.vx));
      state.idle = 0;
    }
    function up() { state.dragging = false; }
    function wheel(e) {
      if (!opts.zoom) return;
      e.preventDefault();
      camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z + e.deltaY * 0.01));
    }
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return {
      state: state,
      tick: function (dt) {
        if (!state.dragging) {
          state.vy *= 0.94; state.vx *= 0.9;
          pivot.rotation.y += state.vy;
          state.idle += dt;
          if (!reduceMotion && state.idle > 1.2) pivot.rotation.y += dt * (opts.spin || 0.06);
        }
      },
      dispose: function () {
        canvas.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        canvas.removeEventListener("wheel", wheel);
      }
    };
  }

  /* Shared renderer loop with resize + visibility pause. */
  function stage(canvas, fov, onResize) {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(fov || 50, 1, 0.1, 200);
    var visible = true, raf = 0, last = performance.now(), hooks = [];

    function resize() {
      var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      if (onResize) onResize(w, h, camera);
      camera.updateProjectionMatrix();
    }
    var ro = new ResizeObserver(resize);
    ro.observe(canvas);
    var io = new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible && !raf) loop();
    });
    io.observe(canvas);

    function loop() {
      raf = 0;
      if (!visible) return;
      var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (var i = 0; i < hooks.length; i++) hooks[i](dt, now / 1000);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    resize();

    return {
      renderer: renderer, scene: scene, camera: camera,
      onFrame: function (fn) { hooks.push(fn); },
      start: function () { last = performance.now(); loop(); },
      dispose: function () {
        cancelAnimationFrame(raf); raf = 0; visible = false;
        ro.disconnect(); io.disconnect();
        scene.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
        });
        renderer.dispose();
      }
    };
  }

  /* Packets travelling along a list of [Vector3, Vector3] segments. */
  function packetSystem(parent, segments, colorFn, count, speed) {
    var packets = [];
    if (!segments.length) return { tick: function () {} };
    for (var i = 0; i < count; i++) {
      var seg = segments[Math.floor(Math.random() * segments.length)];
      var s = sprite(colorFn(seg), 0.32, 0.95);
      parent.add(s);
      packets.push({ s: s, seg: seg, t: Math.random(), v: speed * (0.6 + Math.random() * 0.8), dir: Math.random() < 0.5 ? 1 : -1 });
    }
    return {
      tick: function (dt) {
        if (reduceMotion) return;
        for (var i = 0; i < packets.length; i++) {
          var p = packets[i];
          p.t += dt * p.v;
          if (p.t >= 1) {
            p.t = 0;
            p.seg = segments[Math.floor(Math.random() * segments.length)];
            p.dir = Math.random() < 0.5 ? 1 : -1;
            p.s.material.color.set(colorFn(p.seg));
          }
          var a = p.dir > 0 ? p.seg[0] : p.seg[1], b = p.dir > 0 ? p.seg[1] : p.seg[0];
          p.s.position.lerpVectors(a, b, p.t);
        }
      }
    };
  }

  function lineBetween(a, b, color, opacity, dashed) {
    var geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    var mat = dashed
      ? new THREE.LineDashedMaterial({ color: color, transparent: true, opacity: opacity, dashSize: 0.18, gapSize: 0.12 })
      : new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity });
    var l = new THREE.Line(geo, mat);
    if (dashed) l.computeLineDistances();
    return l;
  }

  /* ---------------------------------------------------------------- HERO */
  function createHeroScene(canvas, labelLayer, domains, handlers) {
    if (!webglOK()) return null;
    // On wide screens push the map right so the headline has room; on tall screens pull back.
    var baseZ = 15;
    var st = stage(canvas, 45, function (w, h, cam) {
      var aspect = w / h;
      baseZ = aspect < 1.1 ? 15 + (1.1 - aspect) * 12 : 16;
      cam.position.z = baseZ;
      if (w > 900) cam.setViewOffset(w, h, -w * 0.2, 0, w, h);
      else cam.clearViewOffset();
    });
    var scene = st.scene, camera = st.camera;
    camera.position.y = 0.6;

    var pivot = new THREE.Group();
    pivot.rotation.x = 0.28;
    scene.add(pivot);
    scene.add(starfield(900, 45, 0x8fa4d8));

    scene.add(new THREE.AmbientLight(0x8899cc, 0.55));
    var key = new THREE.PointLight(0xffffff, 1.2, 60);
    key.position.set(6, 8, 10);
    scene.add(key);

    /* Core: the backbone. */
    var core = new THREE.Group();
    var coreSolid = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 1),
      new THREE.MeshStandardMaterial({ color: 0x1a2a4a, emissive: 0x16345f, roughness: 0.4, metalness: 0.6, flatShading: true })
    );
    var coreWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.55, 1),
      new THREE.MeshBasicMaterial({ color: 0xf5b83d, wireframe: true, transparent: true, opacity: 0.35 })
    );
    core.add(coreSolid, coreWire, sprite("#f5b83d", 4.2, 0.35));
    pivot.add(core);

    /* Orbit rings. */
    [4.6, 6.2].forEach(function (r, i) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.008, 6, 160),
        new THREE.MeshBasicMaterial({ color: 0x5b6f9c, transparent: true, opacity: 0.35 })
      );
      ring.rotation.x = Math.PI / 2 + (i ? 0.22 : -0.12);
      pivot.add(ring);
    });

    /* Domain nodes on two tilted rings. */
    var nodes = [], meshes = [], segments = [];
    var inner = Math.ceil(domains.length / 2);
    domains.forEach(function (d, i) {
      var onInner = i < inner;
      var n = onInner ? inner : domains.length - inner;
      var k = onInner ? i : i - inner;
      var r = onInner ? 4.6 : 6.2;
      var tilt = onInner ? -0.12 : 0.22;
      var a = (k / n) * Math.PI * 2 + (onInner ? 0 : Math.PI / n);
      var p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
      p.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);

      var col = new THREE.Color(d.color);
      var g = new THREE.Group();
      g.position.copy(p);
      var body = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.34, 0),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.4, flatShading: true })
      );
      body.userData.index = i;
      var halo = sprite(d.color, 1.6, 0.45);
      g.add(body, halo);
      pivot.add(g);

      var link = lineBetween(new THREE.Vector3(), p, col, 0.28);
      pivot.add(link);
      segments.push([new THREE.Vector3(), p.clone(), d.color]);

      var label = document.createElement("button");
      label.type = "button";
      label.className = "node-label";
      label.style.setProperty("--c", d.color);
      label.innerHTML = '<span class="nl-name"></span><span class="nl-meta"></span>';
      label.querySelector(".nl-name").textContent = d.short;
      label.querySelector(".nl-meta").textContent = d.layers + " · " + d.proto;
      label.addEventListener("click", function () { handlers.onSelect(d); });
      label.addEventListener("mouseenter", function () { setHover(i); });
      label.addEventListener("mouseleave", function () { setHover(-1); });
      labelLayer.appendChild(label);

      nodes.push({ d: d, g: g, body: body, halo: halo, label: label, base: p.clone(), phase: Math.random() * 6 });
      meshes.push(body);
    });

    /* Peer links between neighbouring domains, for a meshier look. */
    var outer = nodes.length - inner;
    function peer(i, j, opacity) {
      var a = nodes[i].base, b = nodes[j].base;
      pivot.add(lineBetween(a, b, 0x3c4d75, opacity));
      segments.push([a.clone(), b.clone(), nodes[i].d.color]);
    }
    for (var i = 0; i < inner; i++) peer(i, (i + 1) % inner, 0.35);
    for (var o = 0; o < outer; o++) peer(inner + o, inner + (o + 1) % outer, 0.35);
    for (var x = 0; x < inner; x++) peer(x, inner + (x % outer), 0.22);

    var packets = packetSystem(pivot, segments, function (s) { return s[2]; }, 46, 0.42);
    var ctl = orbit(canvas, pivot, camera, { zoom: false, spin: 0.07 });

    /* Hover + click via raycasting. */
    var ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), hover = -1;
    function setHover(i) {
      if (hover === i) return;
      hover = i;
      nodes.forEach(function (n, k) { n.label.classList.toggle("is-hot", k === i); });
      canvas.style.cursor = i >= 0 ? "pointer" : "grab";
      handlers.onHover && handlers.onHover(i >= 0 ? nodes[i].d : null);
    }
    function pick(e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      var hit = ray.intersectObjects(meshes, false)[0];
      return hit ? hit.object.userData.index : -1;
    }
    canvas.addEventListener("pointermove", function (e) { if (!ctl.state.dragging) setHover(pick(e)); });
    canvas.addEventListener("pointerleave", function () { setHover(-1); });
    canvas.addEventListener("click", function (e) {
      if (ctl.state.moved > 6) return;
      var i = pick(e);
      if (i >= 0) handlers.onSelect(nodes[i].d);
    });

    /* Parallax for the camera. */
    var par = { x: 0, y: 0 };
    window.addEventListener("pointermove", function (e) {
      par.x = (e.clientX / window.innerWidth - 0.5);
      par.y = (e.clientY / window.innerHeight - 0.5);
    });

    var tmp = new THREE.Vector3();
    st.onFrame(function (dt, t) {
      ctl.tick(dt);
      packets.tick(dt);
      if (!reduceMotion) {
        core.rotation.y += dt * 0.25;
        coreWire.rotation.x -= dt * 0.18;
        camera.position.x += (par.x * 1.6 - camera.position.x) * 0.04;
        camera.position.y += (0.6 - par.y * 1.2 - camera.position.y) * 0.04;
      }
      camera.lookAt(0, 0, 0);

      var w = canvas.clientWidth, h = canvas.clientHeight;
      nodes.forEach(function (n, k) {
        var hot = k === hover;
        var bob = reduceMotion ? 0 : Math.sin(t * 1.3 + n.phase) * 0.08;
        n.g.position.set(n.base.x, n.base.y + bob, n.base.z);
        n.body.rotation.y += dt * (hot ? 2.2 : 0.6);
        var sc = hot ? 1.45 : 1;
        n.body.scale.lerp(tmp.set(sc, sc, sc), 0.15);
        n.halo.material.opacity += ((hot ? 0.9 : 0.42) - n.halo.material.opacity) * 0.15;

        n.g.getWorldPosition(tmp);
        var depth = tmp.z;
        tmp.project(camera);
        var x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
        n.label.style.transform = "translate(" + x.toFixed(1) + "px," + (y + 16).toFixed(1) + "px) translate(-50%,0)";
        // Fade labels that sit on the far side of the core.
        var front = Math.max(0, Math.min(1, (depth + 6) / 8));
        n.label.style.opacity = hot ? 1 : (0.35 + front * 0.65).toFixed(2);
        n.label.style.zIndex = String(Math.round(front * 100));
      });
    });
    st.start();
    return { dispose: function () { ctl.dispose(); st.dispose(); labelLayer.innerHTML = ""; } };
  }

  /* ------------------------------------------------------------ TOPOLOGY */
  var KIND_COLORS = {
    core: "#F5B83D", router: "#6FA8FF", switch: "#7C8CFF", spine: "#F5B83D", leaf: "#3DDC97",
    server: "#9FB0D6", host: "#9FB0D6", ap: "#4FD1E8", client: "#9FB0D6", dns: "#B889FF",
    fw: "#FF6B7A", cloud: "#62B6FF", hub: "#FF9F5A", branch: "#FFD166", controller: "#E57BD8"
  };

  function V(x, y, z) { return new THREE.Vector3(x, y, z); }

  function ringPositions(n, r, y, offset) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + (offset || 0);
      out.push(V(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    return out;
  }
  function row(n, spacing, y, z) {
    var out = [], w = (n - 1) * spacing;
    for (var i = 0; i < n; i++) out.push(V(-w / 2 + i * spacing, y, z || 0));
    return out;
  }

  /* Each layout returns { nodes: [{p, kind, label}], edges: [[i,j,dashed?]], extras?: fn(group) } */
  var LAYOUTS = {
    star: function () {
      var nodes = [{ p: V(0, 0.4, 0), kind: "switch", label: "Switch" }], edges = [];
      nodes.push({ p: V(0, 2.4, 0), kind: "router", label: "Gateway" });
      edges.push([0, 1]);
      ringPositions(8, 3.4, -0.6).forEach(function (p, i) {
        nodes.push({ p: p, kind: i % 4 === 0 ? "server" : "host", label: i % 4 === 0 ? "Server" : "Host" });
        edges.push([0, nodes.length - 1]);
      });
      return { nodes: nodes, edges: edges };
    },
    campus: function () {
      var nodes = [], edges = [];
      row(2, 3, 2.4).forEach(function (p) { nodes.push({ p: p, kind: "core", label: "Core" }); });
      edges.push([0, 1]);
      row(4, 2.4, 0.6).forEach(function (p) { nodes.push({ p: p, kind: "router", label: "Distribution" }); });
      for (var d = 2; d < 6; d++) { edges.push([0, d]); edges.push([1, d]); }
      row(8, 1.3, -1.4, 0.3).forEach(function (p, i) {
        nodes.push({ p: p, kind: "switch", label: "Access" });
        var a = nodes.length - 1, pair = 2 + Math.floor(i / 4) * 2;
        edges.push([a, pair]); edges.push([a, pair + 1, true]);
      });
      return { nodes: nodes, edges: edges };
    },
    mesh: function () {
      var nodes = [], edges = [];
      ringPositions(4, 1.8, 0.3, 0.3).forEach(function (p) { p.x -= 2.6; nodes.push({ p: p, kind: "router", label: "AS 65001" }); });
      ringPositions(4, 1.8, -0.3, 0.9).forEach(function (p) { p.x += 2.6; nodes.push({ p: p, kind: "router", label: "AS 65002" }); });
      for (var i = 0; i < 4; i++) { edges.push([i, (i + 1) % 4]); edges.push([4 + i, 4 + (i + 1) % 4]); }
      edges.push([0, 2]); edges.push([5, 7]);
      edges.push([0, 6, true]); edges.push([3, 5, true]);
      nodes.push({ p: V(0, 2.8, 0), kind: "cloud", label: "Internet" });
      edges.push([1, 8, true]); edges.push([4, 8, true]);
      return { nodes: nodes, edges: edges };
    },
    ring: function () {
      var nodes = [], edges = [];
      ringPositions(6, 2.6, 0).forEach(function (p) { nodes.push({ p: p, kind: "router", label: "P" }); });
      for (var i = 0; i < 6; i++) edges.push([i, (i + 1) % 6]);
      edges.push([0, 3]);
      ringPositions(6, 4.6, -0.7, 0.2).forEach(function (p, i) {
        nodes.push({ p: p, kind: i % 2 ? "branch" : "switch", label: i % 2 ? "CE" : "PE" });
        edges.push([i, 6 + i]);
      });
      return { nodes: nodes, edges: edges };
    },
    tree: function () {
      var nodes = [{ p: V(0, 2.8, 0), kind: "dns", label: "Root ." }], edges = [];
      var tl = [".com", ".org", ".net"];
      row(3, 3.2, 1, 0).forEach(function (p, i) { nodes.push({ p: p, kind: "dns", label: tl[i] }); edges.push([0, i + 1]); });
      row(6, 1.6, -0.8, 0).forEach(function (p, i) {
        nodes.push({ p: p, kind: "server", label: "Authoritative" });
        edges.push([1 + Math.floor(i / 2), nodes.length - 1]);
      });
      nodes.push({ p: V(0, -2.6, 1.6), kind: "controller", label: "Resolver" });
      var res = nodes.length - 1;
      edges.push([res, 0, true]); edges.push([res, 1, true]); edges.push([res, 4, true]);
      nodes.push({ p: V(-2.4, -2.8, 2.2), kind: "client", label: "Stub" });
      edges.push([nodes.length - 1, res]);
      return { nodes: nodes, edges: edges };
    },
    layers: function () {
      var nodes = [{ p: V(0, 0, 0), kind: "server", label: "Crown jewels" }], edges = [];
      ringPositions(4, 1.9, 0, 0.4).forEach(function (p) { nodes.push({ p: p, kind: "fw", label: "Segment" }); edges.push([0, nodes.length - 1]); });
      ringPositions(6, 3.6, 0).forEach(function (p, i) {
        nodes.push({ p: p, kind: i % 3 === 0 ? "fw" : "client", label: i % 3 === 0 ? "Firewall" : "User" });
        edges.push([1 + (i % 4), nodes.length - 1, i % 3 !== 0]);
      });
      return {
        nodes: nodes, edges: edges,
        extras: function (g, color) {
          [1.9, 3.6].forEach(function (r, i) {
            var shell = new THREE.Mesh(
              new THREE.SphereGeometry(r, 32, 16),
              new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: i ? 0.07 : 0.12 })
            );
            g.add(shell);
          });
        }
      };
    },
    spineleaf: function () {
      var nodes = [], edges = [];
      row(4, 2, 2.2).forEach(function (p) { nodes.push({ p: p, kind: "spine", label: "Spine" }); });
      row(6, 1.5, 0).forEach(function (p) { nodes.push({ p: p, kind: "leaf", label: "Leaf / VTEP" }); });
      for (var s = 0; s < 4; s++) for (var l = 4; l < 10; l++) edges.push([s, l]);
      row(12, 0.75, -1.8, 0.4).forEach(function (p, i) {
        nodes.push({ p: p, kind: "server", label: "Server" });
        var leaf = 4 + Math.floor(i / 2);
        edges.push([nodes.length - 1, leaf]);
      });
      return { nodes: nodes, edges: edges };
    },
    hubspoke: function () {
      var nodes = [{ p: V(0, 0.6, 0), kind: "hub", label: "DC Hub" }], edges = [];
      nodes.push({ p: V(0, 3, 0), kind: "controller", label: "Controller" });
      edges.push([0, 1, true]);
      ringPositions(7, 3.8, -0.4).forEach(function (p, i) {
        nodes.push({ p: p, kind: "branch", label: "Branch " + (i + 1) });
        var b = nodes.length - 1;
        edges.push([0, b]); edges.push([1, b, true]);
      });
      edges.push([2, 3]); edges.push([4, 5]);
      nodes.push({ p: V(3.2, 2.4, -1.4), kind: "cloud", label: "SaaS" });
      edges.push([2, nodes.length - 1, true]); edges.push([4, nodes.length - 1, true]);
      return { nodes: nodes, edges: edges };
    },
    wireless: function () {
      var nodes = [], edges = [];
      nodes.push({ p: V(0, 2.6, 0), kind: "controller", label: "WLC" });
      nodes.push({ p: V(0, 1.2, 0), kind: "switch", label: "PoE Switch" });
      edges.push([0, 1]);
      var aps = row(3, 3.2, 0, 0);
      aps.forEach(function (p) { nodes.push({ p: p, kind: "ap", label: "AP" }); edges.push([1, nodes.length - 1]); });
      for (var i = 0; i < 9; i++) {
        var ap = 2 + (i % 3), base = aps[i % 3];
        var a = Math.random() * Math.PI * 2, r = 0.9 + Math.random() * 0.9;
        nodes.push({ p: V(base.x + Math.cos(a) * r, -1.3, base.z + Math.sin(a) * r), kind: "client", label: "Client" });
        edges.push([ap, nodes.length - 1, true]);
      }
      return {
        nodes: nodes, edges: edges,
        extras: function (g, color, ticks) {
          aps.forEach(function (p, k) {
            for (var w = 0; w < 3; w++) {
              var ring = new THREE.Mesh(
                new THREE.RingGeometry(0.95, 1, 48),
                new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
              );
              ring.rotation.x = -Math.PI / 2;
              ring.position.copy(p);
              g.add(ring);
              (function (ring, offset) {
                ticks.push(function (dt, t) {
                  var f = reduceMotion ? 0.5 : ((t * 0.45 + offset) % 1);
                  var s = 0.3 + f * 2.2;
                  ring.scale.set(s, s, s);
                  ring.material.opacity = 0.55 * (1 - f);
                });
              })(ring, w / 3 + k * 0.13);
            }
          });
        }
      };
    },
    cloud: function () {
      var nodes = [{ p: V(0, 0.4, 0), kind: "hub", label: "Transit GW" }], edges = [];
      ringPositions(5, 3.2, 0.4).forEach(function (p, i) {
        nodes.push({ p: p, kind: "cloud", label: "VPC " + (i + 1) });
        edges.push([0, nodes.length - 1]);
      });
      nodes.push({ p: V(0, -2.4, 2.4), kind: "router", label: "On-prem" });
      edges.push([0, nodes.length - 1, true]);
      nodes.push({ p: V(0, 2.8, 0), kind: "fw", label: "Inspection" });
      edges.push([0, nodes.length - 1]);
      return { nodes: nodes, edges: edges };
    }
  };

  function deviceMesh(kind) {
    var col = new THREE.Color(KIND_COLORS[kind] || "#9FB0D6");
    var mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.5 });
    var geo;
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

  function createTopologyScene(canvas, labelLayer, domain) {
    if (!webglOK()) return null;
    var st = stage(canvas, 45);
    var scene = st.scene, camera = st.camera;
    camera.position.set(0, 1.6, 11);

    scene.add(new THREE.AmbientLight(0x8899cc, 0.6));
    var key = new THREE.PointLight(0xffffff, 1.1, 50);
    key.position.set(4, 7, 8);
    scene.add(key);
    scene.add(starfield(400, 35, 0x6b7fae));

    var pivot = new THREE.Group();
    pivot.rotation.x = 0.12;
    scene.add(pivot);

    var grid = new THREE.GridHelper(14, 28, new THREE.Color(domain.color), 0x243152);
    grid.position.y = -2.2;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    pivot.add(grid);

    var layout = (LAYOUTS[domain.topo] || LAYOUTS.star)();
    var ticks = [];
    var labels = [];
    var meshes = layout.nodes.map(function (n) {
      var m = deviceMesh(n.kind);
      m.position.copy(n.p);
      pivot.add(m);
      var h = sprite(KIND_COLORS[n.kind] || "#9FB0D6", 0.9, 0.3);
      h.position.copy(n.p);
      pivot.add(h);
      return m;
    });

    // Label only the first node of each distinct label, to keep things readable.
    var seen = {};
    layout.nodes.forEach(function (n, i) {
      if (seen[n.label]) return;
      seen[n.label] = true;
      var el = document.createElement("span");
      el.className = "topo-label";
      el.textContent = n.label;
      labelLayer.appendChild(el);
      labels.push({ el: el, m: meshes[i] });
    });

    var segs = [];
    layout.edges.forEach(function (e) {
      var a = layout.nodes[e[0]].p, b = layout.nodes[e[1]].p;
      pivot.add(lineBetween(a, b, e[2] ? domain.color : 0x4a5d8a, e[2] ? 0.55 : 0.6, !!e[2]));
      segs.push([a, b]);
    });
    if (layout.extras) layout.extras(pivot, new THREE.Color(domain.color), ticks);

    var packets = packetSystem(pivot, segs, function () { return domain.color; }, Math.min(40, segs.length * 2), 0.7);
    var ctl = orbit(canvas, pivot, camera, { zoom: true, minZ: 6, maxZ: 18, spin: 0.1 });

    var tmp = new THREE.Vector3();
    st.onFrame(function (dt, t) {
      ctl.tick(dt);
      packets.tick(dt);
      ticks.forEach(function (fn) { fn(dt, t); });
      meshes.forEach(function (m, i) { if (!reduceMotion) m.rotation.y += dt * (0.3 + (i % 3) * 0.1); });
      camera.lookAt(0, 0.2, 0);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      labels.forEach(function (l) {
        l.m.getWorldPosition(tmp);
        tmp.project(camera);
        l.el.style.transform = "translate(" + ((tmp.x * 0.5 + 0.5) * w).toFixed(1) + "px," + ((-tmp.y * 0.5 + 0.5) * h - 30).toFixed(1) + "px) translate(-50%,0)";
      });
    });
    st.start();
    return { dispose: function () { ctl.dispose(); st.dispose(); labelLayer.innerHTML = ""; } };
  }

  window.NetScenes = { createHeroScene: createHeroScene, createTopologyScene: createTopologyScene, webglOK: webglOK };
})();
