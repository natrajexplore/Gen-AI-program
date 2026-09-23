/* NetVerse app: routing, rendering, progress, search, quiz and subnet lab. */
(function () {
  "use strict";

  var DATA = window.NETVERSE;
  var DOMAINS = DATA.domains;
  var byId = {};
  DOMAINS.forEach(function (d) { byId[d.id] = d; });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------------------------------------------------------- progress */
  var KEY = "netverse-progress-v1";
  var progress = { done: {}, quiz: {} };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.done) progress = { done: saved.done, quiz: saved.quiz || {} };
  } catch (e) { /* storage unavailable: progress lasts for this visit only */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
  }

  function lessonsOf(d) {
    var out = [];
    d.modules.forEach(function (m, mi) {
      m.lessons.forEach(function (l, li) { out.push({ key: d.id + ":" + mi + ":" + li, m: mi, l: li, lesson: l, module: m }); });
    });
    return out;
  }
  function domainStats(d) {
    var ls = lessonsOf(d);
    var done = ls.filter(function (x) { return progress.done[x.key]; }).length;
    return { total: ls.length, done: done, pct: ls.length ? done / ls.length : 0 };
  }
  var TOTAL_LESSONS = DOMAINS.reduce(function (n, d) { return n + lessonsOf(d).length; }, 0);
  var TOTAL_QUIZ = DOMAINS.reduce(function (n, d) { return n + d.quiz.length; }, 0);

  function renderGlobalProgress() {
    var done = DOMAINS.reduce(function (n, d) { return n + domainStats(d).done; }, 0);
    $("#global-progress").textContent = done + " / " + TOTAL_LESSONS + " lessons";
  }

  function statsDL(target, pairs) {
    target.innerHTML = "";
    pairs.forEach(function (p) {
      var w = el("div");
      w.appendChild(el("dt", null, p[0]));
      w.appendChild(el("dd", null, p[1]));
      target.appendChild(w);
    });
  }

  /* -------------------------------------------------------------- home */
  var hero = null, levelFilter = "all";

  function readout(d) {
    var body = $("#readout-body");
    if (!d) {
      body.innerHTML = "";
      body.appendChild(document.createTextNode("Hover over a node to see its brief.\nClick a node to open its lessons.\n\n"));
      var b = el("b", null, DOMAINS.length + " domains");
      body.appendChild(b);
      body.appendChild(document.createTextNode(" up · " + TOTAL_LESSONS + " lessons · " + TOTAL_QUIZ + " quiz questions"));
      return;
    }
    var s = domainStats(d);
    var lines = [
      ["domain   ", d.name],
      ["layers   ", d.layers + "  (" + d.proto + ")"],
      ["level    ", d.level + " · ~" + d.hours + " h"],
      ["modules  ", d.modules.length + " · lessons " + s.total],
      ["progress ", Math.round(s.pct * 100) + "% complete"]
    ];
    body.innerHTML = "";
    lines.forEach(function (l, i) {
      body.appendChild(document.createTextNode(l[0]));
      body.appendChild(el("b", null, l[1]));
      if (i < lines.length - 1) body.appendChild(document.createTextNode("\n"));
    });
  }

  function renderGrid() {
    var grid = $("#domain-grid");
    grid.innerHTML = "";
    DOMAINS.forEach(function (d) {
      if (levelFilter !== "all" && d.level !== levelFilter) return;
      var s = domainStats(d);
      var a = el("a", "tile");
      a.href = "#" + d.id;
      a.style.setProperty("--c", d.color);
      var top = el("div", "tile-top");
      top.appendChild(el("span", "port"));
      top.appendChild(el("span", null, d.layers + " · " + d.proto));
      top.appendChild(el("span", "lvl", d.level));
      a.appendChild(top);
      a.appendChild(el("h3", null, d.name));
      a.appendChild(el("p", null, d.tagline));
      a.appendChild(el("div", "tile-meta", d.modules.length + " modules · " + s.total + " lessons · ~" + d.hours + " h" + (s.done ? " · " + s.done + " done" : "")));
      var bar = el("div", "bar"), fill = el("i");
      fill.style.width = (s.pct * 100).toFixed(0) + "%";
      bar.appendChild(fill);
      a.appendChild(bar);
      grid.appendChild(a);
    });
  }

  function renderPaths() {
    var list = $("#path-list");
    list.innerHTML = "";
    DATA.paths.forEach(function (p) {
      var row = el("div", "path");
      var h = el("div");
      h.appendChild(el("h3", null, p.name));
      h.appendChild(el("small", null, p.note + " · " + p.steps.length + " steps"));
      row.appendChild(h);
      var ol = el("ol", "steps");
      p.steps.forEach(function (id, i) {
        var d = byId[id];
        var li = el("li");
        var a = el("a", "step");
        a.href = "#" + id;
        a.style.setProperty("--c", d.color);
        if (domainStats(d).pct === 1) a.classList.add("done");
        a.appendChild(el("span", "n", String(i + 1).padStart(2, "0")));
        a.appendChild(document.createTextNode(d.short));
        li.appendChild(a);
        ol.appendChild(li);
      });
      row.appendChild(ol);
      list.appendChild(row);
    });
  }

  function initHome() {
    statsDL($("#stats"), [
      ["domains", String(DOMAINS.length)],
      ["lessons", String(TOTAL_LESSONS)],
      ["quiz questions", String(TOTAL_QUIZ)],
      ["learning paths", String(DATA.paths.length)]
    ]);
    readout(null);
    renderGrid();
    renderPaths();

    $$(".filters .chip").forEach(function (c) {
      c.addEventListener("click", function () {
        levelFilter = c.getAttribute("data-level");
        $$(".filters .chip").forEach(function (x) { x.classList.toggle("is-on", x === c); });
        renderGrid();
      });
    });
    initSearch();
    initSubnetLab();
  }

  function startHero() {
    if (hero || !window.THREE) {
      if (!window.THREE) $("#no-webgl").hidden = false;
      return;
    }
    hero = window.NetScenes.createHeroScene($("#hero-canvas"), $("#hero-labels"), DOMAINS, {
      onHover: readout,
      onSelect: function (d) { location.hash = d.id; }
    });
    if (!hero) $("#no-webgl").hidden = false;
  }

  /* ------------------------------------------------------------ search */
  var INDEX = [];
  DOMAINS.forEach(function (d) {
    INDEX.push({ d: d, title: d.name, meta: "Domain · " + d.layers, text: (d.name + " " + d.tagline + " " + d.proto).toLowerCase() });
    lessonsOf(d).forEach(function (x) {
      INDEX.push({
        d: d, key: x.key, title: x.lesson.t, meta: d.short + " › " + x.module.title,
        text: (x.lesson.t + " " + x.lesson.body + " " + (x.lesson.points || []).join(" ") + " " + (x.lesson.cli || "")).toLowerCase()
      });
    });
  });

  var pendingLesson = null;

  function initSearch() {
    var input = $("#search-input"), box = $("#search-results");
    function run() {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { box.hidden = true; return; }
      var terms = q.split(/\s+/);
      var hits = INDEX.filter(function (it) {
        return terms.every(function (t) { return it.text.indexOf(t) !== -1 || it.title.toLowerCase().indexOf(t) !== -1; });
      }).slice(0, 12);
      box.innerHTML = "";
      if (!hits.length) {
        box.appendChild(el("p", "search-empty", "No lessons match \"" + input.value.trim() + "\". Try a protocol name such as BGP or DHCP."));
      }
      hits.forEach(function (h) {
        var b = el("button");
        b.type = "button";
        b.style.setProperty("--c", h.d.color);
        b.appendChild(el("span", "sr-title", h.title));
        b.appendChild(el("span", "sr-meta", h.meta));
        b.addEventListener("click", function () {
          pendingLesson = h.key || null;
          box.hidden = true;
          input.value = "";
          if (location.hash === "#" + h.d.id) route(); else location.hash = h.d.id;
        });
        box.appendChild(b);
      });
      box.hidden = false;
    }
    input.addEventListener("input", run);
    input.addEventListener("focus", run);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { box.hidden = true; input.blur(); }
      if (e.key === "Enter") { var first = $("button", box); if (first) first.click(); }
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".search")) box.hidden = true;
    });
  }

  /* -------------------------------------------------------- subnet lab */
  function ipToInt(s) {
    var p = s.split(".");
    if (p.length !== 4) return null;
    var n = 0;
    for (var i = 0; i < 4; i++) {
      if (!/^\d{1,3}$/.test(p[i])) return null;
      var v = +p[i];
      if (v > 255) return null;
      n = n * 256 + v;
    }
    return n;
  }
  function intToIp(n) {
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  }
  function ipClass(first) {
    if (first < 128) return "A";
    if (first < 192) return "B";
    if (first < 224) return "C";
    if (first < 240) return "D (multicast)";
    return "E (reserved)";
  }
  function scope(n) {
    var a = n >>> 24, b = (n >>> 16) & 255;
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "Private (RFC 1918)";
    if (a === 100 && b >= 64 && b <= 127) return "Shared / CGNAT (RFC 6598)";
    if (a === 127) return "Loopback";
    if (a === 169 && b === 254) return "Link-local (APIPA)";
    if (a >= 224 && a <= 239) return "Multicast";
    return "Public";
  }

  function calcSubnet(str) {
    var m = str.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\s*\/\s*(\d{1,2})$/);
    if (!m) return { error: "Use the format address/prefix, for example 10.1.4.20/22." };
    var ip = ipToInt(m[1]);
    var prefix = +m[2];
    if (ip === null) return { error: "Each octet must be a number from 0 to 255." };
    if (prefix > 32) return { error: "The prefix length must be between /0 and /32." };
    var mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
    var net = (ip & mask) >>> 0;
    var bc = (net | (~mask >>> 0)) >>> 0;
    var size = Math.pow(2, 32 - prefix);
    var first, last, usable;
    if (prefix === 32) { first = last = net; usable = 1; }
    else if (prefix === 31) { first = net; last = bc; usable = 2; }
    else { first = net + 1; last = bc - 1; usable = size - 2; }
    return {
      ip: ip, prefix: prefix, mask: mask, net: net, bc: bc,
      rows: [
        ["Network", intToIp(net) + "/" + prefix],
        ["Subnet mask", intToIp(mask)],
        ["Wildcard", intToIp(~mask >>> 0)],
        ["Broadcast", prefix >= 31 ? "n/a (" + (prefix === 31 ? "RFC 3021 point-to-point" : "host route") + ")" : intToIp(bc)],
        ["Usable range", intToIp(first) + " – " + intToIp(last)],
        ["Usable hosts", usable.toLocaleString("en-US")],
        ["Total addresses", size.toLocaleString("en-US")],
        ["Class / scope", ipClass(ip >>> 24) + " · " + scope(ip)]
      ]
    };
  }

  function initSubnetLab() {
    var form = $("#subnet-form"), input = $("#cidr-input"), out = $("#subnet-out"), err = $("#cidr-error");
    function render() {
      var r = calcSubnet(input.value);
      if (r.error) { err.textContent = r.error; err.hidden = false; return; }
      err.hidden = true;
      out.innerHTML = "";
      var dl = el("dl", "kv");
      r.rows.forEach(function (row) { dl.appendChild(el("dt", null, row[0])); dl.appendChild(el("dd", null, row[1])); });
      out.appendChild(dl);
      // Binary view: network bits in amber, host bits dimmed.
      var bits = el("div", "bits");
      var bin = ("00000000000000000000000000000000" + (r.ip >>> 0).toString(2)).slice(-32);
      for (var o = 0; o < 4; o++) {
        for (var b = 0; b < 8; b++) {
          var i = o * 8 + b;
          var span = el("span", i < r.prefix ? "net" : "host", bin[i]);
          bits.appendChild(span);
        }
        if (o < 3) bits.appendChild(document.createTextNode("."));
      }
      bits.appendChild(document.createTextNode("   /" + r.prefix + " = " + r.prefix + " network bits · " + (32 - r.prefix) + " host bits"));
      out.appendChild(bits);
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); render(); });
    render();
  }

  /* ------------------------------------------------------------ domain */
  var topo = null, quizState = null;

  function renderDomain(d) {
    document.title = d.name + " · NetVerse Academy";
    var view = $("#view-domain");
    view.style.setProperty("--c", d.color);
    $("#d-eyebrow").textContent = d.layers + " · " + d.proto + " · " + d.level;
    $("#d-title").textContent = d.name;
    $("#d-tagline").textContent = d.tagline;
    var ls = lessonsOf(d);
    statsDL($("#d-stats"), [
      ["modules", String(d.modules.length)],
      ["lessons", String(ls.length)],
      ["quiz", d.quiz.length + " Qs"],
      ["study time", "~" + d.hours + " h"]
    ]);

    var wrap = $("#d-modules");
    wrap.innerHTML = "";
    d.modules.forEach(function (m, mi) {
      var sec = el("section", "module");
      var head = el("div", "module-head");
      head.appendChild(el("span", "idx", "M" + (mi + 1)));
      head.appendChild(el("h2", null, m.title));
      sec.appendChild(head);
      m.lessons.forEach(function (l, li) {
        var key = d.id + ":" + mi + ":" + li;
        var det = el("details", "lesson");
        det.id = "lesson-" + d.id + "-" + mi + "-" + li;
        if (progress.done[key]) det.classList.add("is-done");
        var sum = el("summary");
        sum.appendChild(el("span", "check"));
        sum.appendChild(el("span", null, l.t));
        det.appendChild(sum);

        var body = el("div", "lesson-body");
        body.appendChild(el("p", null, l.body));
        if (l.points && l.points.length) {
          var ul = el("ul");
          l.points.forEach(function (p) { ul.appendChild(el("li", null, p)); });
          body.appendChild(ul);
        }
        if (l.cli) {
          var cli = el("div", "cli");
          cli.appendChild(el("div", "cli-head", "example"));
          cli.appendChild(el("pre", null, l.cli));
          body.appendChild(cli);
        }
        var btn = el("button", "btn btn-ghost");
        btn.type = "button";
        function syncBtn() { btn.textContent = progress.done[key] ? "Mark as not done" : "Mark lesson complete"; }
        syncBtn();
        btn.addEventListener("click", function () {
          if (progress.done[key]) delete progress.done[key]; else progress.done[key] = true;
          det.classList.toggle("is-done", !!progress.done[key]);
          syncBtn();
          save();
          renderSideProgress(d);
          renderGlobalProgress();
        });
        body.appendChild(btn);
        det.appendChild(body);
        sec.appendChild(det);
      });
      wrap.appendChild(sec);
    });

    renderSideProgress(d);
    quizState = { d: d, i: 0, score: 0, answered: false, finished: false };
    renderQuiz();

    if (topo) { topo.dispose(); topo = null; }
    if (window.THREE && window.NetScenes) topo = window.NetScenes.createTopologyScene($("#topo-canvas"), $("#topo-labels"), d);
  }

  function renderSideProgress(d) {
    var s = domainStats(d);
    var panel = $("#d-progress");
    var r = 32, circ = 2 * Math.PI * r;
    panel.innerHTML =
      '<h3>Your progress</h3><div class="ring-row">' +
      '<svg class="ring" viewBox="0 0 76 76" role="img" aria-label="' + Math.round(s.pct * 100) + '% complete">' +
      '<circle class="track" cx="38" cy="38" r="' + r + '"/>' +
      '<circle class="fill" cx="38" cy="38" r="' + r + '" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * (1 - s.pct)).toFixed(1) + '"/>' +
      '<text x="38" y="38">' + Math.round(s.pct * 100) + '%</text></svg>' +
      '<div class="ring-copy"><strong>' + s.done + ' of ' + s.total + '</strong> lessons done.<br>' +
      (progress.quiz[d.id] != null ? 'Best quiz score: <strong>' + progress.quiz[d.id] + '/' + d.quiz.length + '</strong>' : 'Quiz not attempted yet.') +
      '</div></div>';
  }

  function renderQuiz() {
    var q = quizState, d = q.d, panel = $("#d-quiz");
    panel.innerHTML = "";
    panel.appendChild(el("h3", null, "Check yourself"));
    if (q.finished) {
      var pct = q.score / d.quiz.length;
      panel.appendChild(el("p", "quiz-q", "You scored " + q.score + " out of " + d.quiz.length + "."));
      panel.appendChild(el("p", "why", pct === 1 ? "Perfect score. Try a domain from one of the learning paths next." : "Go back over the lessons for the questions you missed, then retake the quiz."));
      var again = el("button", "btn", "Retake quiz");
      again.type = "button";
      again.addEventListener("click", function () { quizState = { d: d, i: 0, score: 0, answered: false, finished: false }; renderQuiz(); });
      panel.appendChild(again);
      return;
    }
    var item = d.quiz[q.i];
    var meta = el("div", "quiz-meta");
    meta.appendChild(el("span", null, "Question " + (q.i + 1) + " of " + d.quiz.length));
    meta.appendChild(el("span", null, "Score " + q.score));
    panel.appendChild(meta);
    panel.appendChild(el("p", "quiz-q", item.q));
    var opts = el("div", "opts");
    var why = el("p", "why");
    why.hidden = true;
    var next = el("button", "btn", q.i + 1 < d.quiz.length ? "Next question" : "See score");
    next.type = "button";
    next.hidden = true;
    item.o.forEach(function (text, oi) {
      var b = el("button", "opt", text);
      b.type = "button";
      b.addEventListener("click", function () {
        if (q.answered) return;
        q.answered = true;
        var ok = oi === item.a;
        if (ok) q.score++;
        $$(".opt", opts).forEach(function (x, xi) {
          x.disabled = true;
          if (xi === item.a) x.classList.add("right");
          else if (xi === oi) x.classList.add("wrong");
        });
        why.innerHTML = "";
        why.appendChild(el("b", null, ok ? "Correct. " : "Not quite. "));
        why.appendChild(document.createTextNode(item.why));
        why.hidden = false;
        next.hidden = false;
        next.focus();
      });
      opts.appendChild(b);
    });
    panel.appendChild(opts);
    panel.appendChild(why);
    next.addEventListener("click", function () {
      q.i++;
      q.answered = false;
      if (q.i >= d.quiz.length) {
        q.finished = true;
        if (progress.quiz[d.id] == null || q.score > progress.quiz[d.id]) { progress.quiz[d.id] = q.score; save(); }
        renderSideProgress(d);
      }
      renderQuiz();
    });
    var actions = el("div", "quiz-actions");
    actions.appendChild(next);
    panel.appendChild(actions);
  }

  /* ------------------------------------------------------------- route */
  var pendingJump = null, lastHash = null;

  function route() {
    lastHash = location.hash;
    var id = location.hash.replace(/^#/, "");
    var d = byId[id];
    var home = $("#view-home"), dom = $("#view-domain");
    if (d) {
      home.hidden = true;
      dom.hidden = false;
      renderDomain(d);
      if (pendingLesson) {
        var parts = pendingLesson.split(":");
        var det = document.getElementById("lesson-" + parts.join("-"));
        pendingLesson = null;
        if (det) { det.open = true; setTimeout(function () { det.scrollIntoView({ block: "center" }); }, 50); }
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      if (topo) { topo.dispose(); topo = null; }
      document.title = "NetVerse Academy";
      dom.hidden = true;
      home.hidden = false;
      renderGrid();
      renderPaths();
      startHero();
      var target = pendingJump || (id && document.getElementById(id) ? id : null);
      pendingJump = null;
      if (target) setTimeout(function () { var t = document.getElementById(target); if (t) t.scrollIntoView(); }, 30);
    }
    renderGlobalProgress();
  }

  $$("[data-home]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      pendingJump = a.getAttribute("data-jump");
      if (location.hash && location.hash !== "#") {
        history.pushState(null, "", location.pathname + location.search);
      }
      route();
      if (!pendingJump && !a.getAttribute("data-jump")) window.scrollTo(0, 0);
    });
  });

  // Hash navigation can fire both popstate and hashchange; route once per change.
  function routeIfChanged() {
    if (location.hash === lastHash) return;
    route();
  }
  window.addEventListener("hashchange", routeIfChanged);
  window.addEventListener("popstate", routeIfChanged);

  initHome();
  route();
})();
