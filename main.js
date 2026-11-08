// Hero animation: particles advected through a 2D dynamical system.
// The field is a sum of damped rotational cells (spiral sinks and sources),
// a nod to the phase portraits of the ODE models in my research.
(function () {
  const canvas = document.getElementById("flow");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Viridis stops, sampled by particle speed.
  const VIRIDIS = [
    [68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]
  ];
  function viridis(t) {
    t = Math.min(1, Math.max(0, t));
    const x = t * (VIRIDIS.length - 1);
    const i = Math.min(VIRIDIS.length - 2, Math.floor(x));
    const f = x - i;
    const a = VIRIDIS[i], b = VIRIDIS[i + 1];
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * f) + "," +
      Math.round(a[1] + (b[1] - a[1]) * f) + "," +
      Math.round(a[2] + (b[2] - a[2]) * f) + ")";
  }

  let W = 0, H = 0, dpr = 1, particles = [], cells = [];
  const pointer = { x: -9999, y: -9999, active: false };

  function makeCells() {
    // Cells sit mostly on the right, where the hero has no text.
    cells = [
      { x: 0.72, y: 0.32, s: 1.0, d: -0.18 },
      { x: 0.88, y: 0.70, s: -0.9, d: -0.12 },
      { x: 0.55, y: 0.78, s: 0.7, d: 0.10 },
      { x: 0.95, y: 0.15, s: -0.6, d: -0.08 },
      { x: 0.35, y: 0.30, s: -0.5, d: -0.10 }
    ];
  }

  function field(px, py) {
    // Velocity at a point, in pixels per frame.
    let vx = 0.45, vy = 0.0; // gentle drift to the right
    const L = Math.min(W, H) * 0.42;
    for (const c of cells) {
      const dx = px - c.x * W, dy = py - c.y * H;
      const r2 = (dx * dx + dy * dy) / (L * L);
      const g = Math.exp(-r2) * 3.4;
      vx += g * (-c.s * dy / L + c.d * dx / L);
      vy += g * (c.s * dx / L + c.d * dy / L);
    }
    if (pointer.active) {
      const dx = px - pointer.x, dy = py - pointer.y;
      const r2 = (dx * dx + dy * dy) / 9000;
      const g = Math.exp(-r2) * 3.0;
      vx += g * (-dy / 95);
      vy += g * (dx / 95);
    }
    return [vx, vy];
  }

  function spawn(p) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.age = 0;
    p.life = 120 + Math.random() * 220;
    return p;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeCells();
    const n = Math.round(Math.min(1400, (W * H) / 900));
    particles = Array.from({ length: n }, () => spawn({}));
    ctx.fillStyle = "#1c0a30";
    ctx.fillRect(0, 0, W, H);
  }

  function step(fadeAlpha) {
    ctx.fillStyle = "rgba(28, 10, 48, " + fadeAlpha + ")";
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1.5;
    for (const p of particles) {
      const [vx, vy] = field(p.x, p.y);
      const nx = p.x + vx, ny = p.y + vy;
      const speed = Math.sqrt(vx * vx + vy * vy);
      ctx.strokeStyle = viridis(0.3 + 0.7 * Math.min(1, speed / 3.0));
      ctx.globalAlpha = Math.min(1, p.age / 20) * Math.min(1, (p.life - p.age) / 30) * 0.95;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx; p.y = ny; p.age++;
      if (p.age > p.life || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) spawn(p);
    }
    ctx.globalAlpha = 1;
  }

  let running = true;
  function loop() {
    if (running) step(0.045);
    requestAnimationFrame(loop);
  }

  resize();
  if (reduceMotion) {
    // One still frame of streamlines instead of motion.
    for (let i = 0; i < 260; i++) step(0.0);
  } else {
    requestAnimationFrame(loop);
    const hero = canvas.parentElement;
    hero.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = true;
    });
    hero.addEventListener("pointerleave", () => { pointer.active = false; });
    // Pause when the hero is off screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        running = entries[0].isIntersecting;
      }).observe(hero);
    }
  }
  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      resize();
      if (reduceMotion) for (let i = 0; i < 260; i++) step(0.0);
    }, 150);
  });
})();
