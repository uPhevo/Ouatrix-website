/* ===========================================================================
   Odyssey — cosmic landing interactions
   - Parallax starfield (canvas) reacting to scroll + pointer
   - Drifting nebula parallax
   - Scroll reveal + animated counters
   - Sticky nav state + active-section highlight + scroll progress
   - 3D tilt on cards, pointer glow
   - Interactive (illustrative) pCR decision-support demo
   ========================================================================== */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ─────────────────────────────────────────────────────────────────────────
     1. Starfield — three parallax depth layers
     ──────────────────────────────────────────────────────────────────────── */
  const canvas = document.getElementById("space");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let stars = [];
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollY = window.scrollY;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStars();
  }

  function buildStars() {
    const count = Math.min(220, Math.round((W * H) / 9000));
    stars = [];
    const tints = ["#ffffff", "#cfe0ff", "#bff0ff", "#e3d4ff"];
    for (let i = 0; i < count; i++) {
      const depth = Math.random();             // 0 = far, 1 = near
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: depth,
        r: lerp(0.4, 1.8, depth) + Math.random() * 0.4,
        base: lerp(0.25, 0.9, depth),
        tw: Math.random() * Math.PI * 2,        // twinkle phase
        tint: tints[(Math.random() * tints.length) | 0],
      });
    }
  }

  function drawStars(t) {
    ctx.clearRect(0, 0, W, H);
    // smooth pointer
    pointer.x = lerp(pointer.x, pointer.tx, 0.06);
    pointer.y = lerp(pointer.y, pointer.ty, 0.06);

    for (const s of stars) {
      const px = (pointer.x - 0.5) * 60 * s.z;       // pointer parallax
      const py = (pointer.y - 0.5) * 60 * s.z + scrollY * 0.15 * s.z; // scroll parallax
      let y = s.y - py;
      // wrap vertically so the field is endless on scroll
      y = ((y % H) + H) % H;
      const x = s.x - px;
      const twinkle = 0.6 + 0.4 * Math.sin(t * 0.001 + s.tw);
      ctx.globalAlpha = s.base * twinkle;
      ctx.fillStyle = s.tint;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  let rafId;
  function loop(t) {
    drawStars(t);
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  if (!prefersReduced) loop(0);
  else drawStars(0);

  /* ─────────────────────────────────────────────────────────────────────────
     2. Pointer tracking — starfield + nebula + cursor glow
     ──────────────────────────────────────────────────────────────────────── */
  const nebulae = [...document.querySelectorAll(".nebula")];
  const cursorGlow = document.getElementById("cursorGlow");
  const heroOrbit = document.getElementById("heroOrbit");
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];

  window.addEventListener("pointermove", (e) => {
    pointer.tx = e.clientX / W;
    pointer.ty = e.clientY / H;

    if (cursorGlow) {
      cursorGlow.style.opacity = "1";
      cursorGlow.style.left = e.clientX + "px";
      cursorGlow.style.top = e.clientY + "px";
    }

    const dx = (e.clientX / W - 0.5);
    const dy = (e.clientY / H - 0.5);

    if (!prefersReduced) {
      nebulae.forEach((n) => {
        const d = parseFloat(n.dataset.depth || "0.1");
        n.style.transform = `translate3d(${dx * d * 120}px, ${dy * d * 120}px, 0)`;
      });
      if (heroOrbit) {
        heroOrbit.style.transform =
          `translate(-50%, -50%) rotateX(${dy * -8}deg) rotateY(${dx * 12}deg)`;
      }
    }
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    if (cursorGlow) cursorGlow.style.opacity = "0";
  });

  /* ─────────────────────────────────────────────────────────────────────────
     3. Scroll — progress bar, nav state, hero parallax, active link
     ──────────────────────────────────────────────────────────────────────── */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("scrollProgress");
  const navLinks = [...document.querySelectorAll(".nav__link")];
  const sections = navLinks
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);

  function onScroll() {
    scrollY = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const p = docH > 0 ? scrollY / docH : 0;
    if (progress) progress.style.width = (p * 100).toFixed(2) + "%";

    nav.classList.toggle("is-scrolled", scrollY > 30);

    // hero content drifts up slightly (parallax)
    if (!prefersReduced) {
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || "0.2");
        el.style.transform = `translateY(${scrollY * speed * -0.25}px)`;
      });
    }

    // active section
    const mid = scrollY + window.innerHeight * 0.4;
    let activeId = sections[0] && sections[0].id;
    for (const sec of sections) {
      if (sec.offsetTop <= mid) activeId = sec.id;
    }
    navLinks.forEach((l) =>
      l.classList.toggle("is-active", l.getAttribute("href") === "#" + activeId)
    );
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ─────────────────────────────────────────────────────────────────────────
     4. Scroll reveal + animated counters
     ──────────────────────────────────────────────────────────────────────── */
  const revealEls = [...document.querySelectorAll(".reveal")];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      entry.target.querySelectorAll("[data-count]").forEach(runCounter);
      if (entry.target.matches("[data-count]")) runCounter(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
  revealEls.forEach((el) => io.observe(el));

  // counters that live outside .reveal (chips, stats)
  const looseCounters = [...document.querySelectorAll("[data-count]")].filter(
    (el) => !el.closest(".reveal")
  );
  const io2 = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      runCounter(e.target);
      io2.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  looseCounters.forEach((el) => io2.observe(el));

  function runCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const text = el.dataset.text;
    if (text) { el.textContent = text; return; }     // e.g. "∞"
    const target = parseFloat(el.dataset.count || "0");
    const suffix = el.dataset.suffix || "";
    const dur = 1400;
    const start = performance.now();
    function step(now) {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     5. 3D tilt on cards
     ──────────────────────────────────────────────────────────────────────── */
  if (!prefersReduced && window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          `perspective(800px) rotateX(${py * -6}deg) rotateY(${px * 8}deg) translateY(-4px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     6. Interactive decision-support demo (illustrative only)
     ──────────────────────────────────────────────────────────────────────── */
  const demo = (() => {
    const rHer2 = document.getElementById("r-her2");
    const rProlif = document.getElementById("r-prolif");
    const rImmune = document.getElementById("r-immune");
    const seg = document.getElementById("seg-er");
    if (!rHer2) return;

    const vHer2 = document.getElementById("v-her2");
    const vProlif = document.getElementById("v-prolif");
    const vImmune = document.getElementById("v-immune");
    const gaugeArc = document.getElementById("gaugeArc");
    const pcrNum = document.getElementById("pcrNum");
    const CIRC = 2 * Math.PI * 84; // 527.7

    let er = "neg";

    // Plausible, monotonic toy model — NOT the real M1.
    function compute() {
      const her2 = +rHer2.value, prolif = +rProlif.value, immune = +rImmune.value;
      let z = -2.2
        + 0.030 * her2
        + 0.012 * prolif
        + 0.018 * immune
        + (er === "neg" ? 1.1 : 0);
      const pcr = clamp(1 / (1 + Math.exp(-z)), 0.05, 0.95);

      // gauge
      const offset = CIRC * (1 - pcr);
      gaugeArc.style.strokeDashoffset = offset.toFixed(1);
      animateNum(pcrNum, Math.round(pcr * 100), "%");

      // protocol ranking — base efficacy modulated by patient signal
      const arms = {
        TDM1P: 0.62 + 0.0020 * her2 + 0.0015 * immune,
        THP:   0.58 + 0.0016 * her2 + 0.0010 * prolif,
        CT_T:  0.42 + 0.0012 * her2,
        NER:   0.34 + 0.0018 * her2 - 0.0008 * immune,
      };
      const max = Math.max(...Object.values(arms));
      const sorted = Object.entries(arms).sort((a, b) => b[1] - a[1]);
      const topArm = sorted[0][0];

      document.querySelectorAll(".rank").forEach((row) => {
        const arm = row.dataset.arm;
        const val = clamp(arms[arm] / (max + 0.001), 0.12, 1);
        row.querySelector("i").style.width = (val * 100).toFixed(0) + "%";
        row.classList.toggle("is-top", arm === topArm);
      });
    }

    let numRaf;
    function animateNum(el, target, suffix) {
      cancelAnimationFrame(numRaf);
      const from = parseInt(el.textContent) || 0;
      const start = performance.now();
      const dur = 450;
      function step(now) {
        const t = clamp((now - start) / dur, 0, 1);
        const v = Math.round(lerp(from, target, 1 - Math.pow(1 - t, 3)));
        el.textContent = v + suffix;
        if (t < 1) numRaf = requestAnimationFrame(step);
      }
      numRaf = requestAnimationFrame(step);
    }

    rHer2.addEventListener("input", () => { vHer2.textContent = rHer2.value; compute(); });
    rProlif.addEventListener("input", () => { vProlif.textContent = rProlif.value; compute(); });
    rImmune.addEventListener("input", () => { vImmune.textContent = rImmune.value; compute(); });
    seg.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg__btn");
      if (!btn) return;
      er = btn.dataset.er;
      seg.querySelectorAll(".seg__btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      compute();
    });

    // run once when scrolled into view so the gauge animates in
    const demoSection = document.getElementById("demo");
    const dio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { compute(); dio.disconnect(); } });
    }, { threshold: 0.3 });
    dio.observe(demoSection);

    return { compute };
  })();

  /* ─────────────────────────────────────────────────────────────────────────
     7. Animated license key in the CTA (mirrors the app's 12-box field)
     ──────────────────────────────────────────────────────────────────────── */
  (() => {
    const field = document.getElementById("keyfield");
    if (!field || prefersReduced) return;
    const boxes = [...field.children];
    const charset = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
    let i = 0;
    setInterval(() => {
      const box = boxes[i % boxes.length];
      box.textContent = charset[(Math.random() * charset.length) | 0];
      box.style.color = "#cfe0ff";
      box.style.display = "grid";
      box.style.placeItems = "center";
      box.style.fontFamily = "var(--mono)";
      box.style.fontWeight = "600";
      setTimeout(() => { box.textContent = ""; }, 1400);
      i++;
    }, 320);
  })();

  /* ─────────────────────────────────────────────────────────────────────────
     8. Smooth-scroll for in-page anchors (respects native when reduced)
     ──────────────────────────────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    });
  });
})();
