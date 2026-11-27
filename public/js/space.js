// Original canvas observatory. No external scripts, images, or animation libraries.
const canvas = document.querySelector("#spaceCanvas");
const root = document.documentElement;
const ctx = canvas?.getContext("2d");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let paused = false;
try {
  paused = localStorage.getItem("awssbg-motion") === "paused";
} catch {}
let frame = 0,
  w = 0,
  h = 0,
  dpr = 1,
  px = 0,
  py = 0,
  tx = 0,
  ty = 0,
  elapsed = 0,
  last = 0,
  stars = [];
const motionButton = document.querySelector("#motionToggle");
try {
  elapsed = Number(sessionStorage.getItem("awssbg-sky-phase")) || 0;
} catch {}
addEventListener("pagehide", () => {
  try {
    sessionStorage.setItem("awssbg-sky-phase", String(elapsed));
  } catch {}
});
const motionOff = () => paused || reduced.matches;
function refreshMotion() {
  root.dataset.motion = motionOff() ? "paused" : "running";
  if (motionButton) {
    motionButton.setAttribute("aria-pressed", String(motionOff()));
    motionButton.querySelector("span").textContent = reduced.matches
      ? "Motion reduced"
      : paused
        ? "Resume motion"
        : "Pause motion";
    motionButton.disabled = reduced.matches;
    motionButton
      .querySelector("path")
      .setAttribute("d", motionOff() ? "M8 5l12 7-12 7z" : "M9 5v14M15 5v14");
  }
  cancelAnimationFrame(frame);
  last = 0;
  draw(performance.now());
}
motionButton?.addEventListener("click", () => {
  paused = !paused;
  try {
    localStorage.setItem("awssbg-motion", paused ? "paused" : "running");
  } catch {}
  refreshMotion();
});
reduced.addEventListener("change", refreshMotion);
let seed = 441;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function resize() {
  if (!ctx) return;
  w = innerWidth;
  h = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 1.75);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  seed = 441;
  stars = Array.from(
    { length: Math.min(540, Math.max(130, Math.round((w * h) / 2600))) },
    () => ({
      x: rnd(),
      y: rnd(),
      z: 0.18 + rnd() * 0.82,
      r: 0.25 + rnd() ** 4 * 1.7,
      phase: rnd() * 6.28,
      tint: Math.floor(rnd() * 3),
    }),
  ); // A narrow, irregular belt of distant stars gives the sky a little photographic depth.
  for (let i = 0; i < Math.min(200, Math.round((w * h) / 4500)); i++) {
    const x = rnd(),
      scatter = (rnd() + rnd() + rnd() - 1.5) * 0.19;
    stars.push({
      x,
      y: wrap(0.78 - x * 0.57 + scatter),
      z: 0.12 + rnd() * 0.22,
      r: 0.22 + rnd() * 0.55,
      phase: rnd() * 6.28,
      tint: Math.floor(rnd() * 3),
      dust: true,
    });
  }
  if (motionOff() || document.hidden) paint();
}
function wrap(n) {
  return ((n % 1) + 1) % 1;
}
const orbitSpecs = [
  {
    rx: 0.47,
    ry: 0.26,
    tilt: -0.33,
    speed: 0.065,
    phase: 1.9,
    color: "#e9b6dc",
  },
  {
    rx: 0.43,
    ry: 0.32,
    tilt: 0.44,
    speed: -0.045,
    phase: 5.2,
    color: "#a8d3eb",
  },
  {
    rx: 0.55,
    ry: 0.19,
    tilt: -0.73,
    speed: 0.038,
    phase: 3.1,
    color: "#f2d7a0",
  },
];
function paint() {
  if (!ctx || !w) return;
  const dark = root.dataset.theme === "dark",
    t = elapsed;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const palette = dark
    ? ["#fff4e4", "#c4d9ff", "#e9c2dc"]
    : ["#5d567e", "#637ca0", "#9e6686"];
  // Several speeds and brightness levels simulate a distant sky rather than a repeating tile.
  for (const s of stars) {
    let x = wrap(s.x + t * 0.00015 * s.z + px * s.z * 0.014) * w,
      y = wrap(s.y - t * 0.0001 * s.z + py * s.z * 0.014) * h;
    ctx.globalAlpha =
      ((dark ? 0.44 : 0.3) +
        (0.14 + 0.11 * s.z) * Math.sin(t * (0.5 + s.z) + s.phase)) *
      (s.dust ? 0.65 : 1);
    ctx.fillStyle = palette[s.tint];
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
    if (s.r > 1.55) {
      ctx.globalAlpha *= 0.3;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, s.r * 5);
      halo.addColorStop(0, palette[s.tint]);
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, s.r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Large orbital paths gently precess; bodies follow the actual rotated ellipse.
  const cx = w * 0.5 + px * 11,
    cy = h * 0.51 + py * 9;
  const span = Math.min(w, h * 1.6);
  for (const o of orbitSpecs) {
    const rx = span * o.rx,
      ry = span * o.ry,
      angle = o.tilt + Math.sin(t * 0.035 + o.phase) * 0.12;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = dark ? "rgba(198,205,243,.19)" : "rgba(81,71,121,.15)";
    ctx.lineWidth = 0.8;
    ctx.setLineDash(o.speed < 0 ? [2, 8] : []);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const a = o.phase + t * o.speed,
      x = rx * Math.cos(a),
      y = ry * Math.sin(a);
    ctx.fillStyle = dark ? o.color : "#8371a6";
    ctx.shadowColor = o.color;
    ctx.shadowBlur = dark ? 11 : 0;
    ctx.beginPath();
    ctx.arc(x, y, 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Occasional short, subtle meteor, deterministic and not a constant warp effect.
  const cycle = (t + 2) % 19;
  if (cycle < 1.15 && !motionOff()) {
    const q = cycle / 1.15,
      x = w * (0.73 - q * 0.3),
      y = h * (0.12 + q * 0.24),
      len = Math.min(w * 0.13, 105);
    const a = Math.sin(q * Math.PI);
    const grad = ctx.createLinearGradient(x, y, x + len, y - len * 0.66);
    grad.addColorStop(
      0,
      dark ? `rgba(242,232,255,${a * 0.85})` : `rgba(96,77,133,${a * 0.65})`,
    );
    grad.addColorStop(1, "transparent");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y - len * 0.66);
    ctx.stroke();
  }
}
function draw(now) {
  if (!ctx) return;
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  if (!motionOff()) {
    elapsed += dt;
    px += (tx - px) * Math.min(1, dt * 2);
    py += (ty - py) * Math.min(1, dt * 2);
  }
  paint();
  if (!motionOff() && !document.hidden) frame = requestAnimationFrame(draw);
}
addEventListener("resize", resize, { passive: true });
addEventListener(
  "pointermove",
  (e) => {
    tx = e.clientX / Math.max(w, 1) - 0.5;
    ty = e.clientY / Math.max(h, 1) - 0.5;
  },
  { passive: true },
);
document.addEventListener("visibilitychange", refreshMotion);
new MutationObserver(() => {
  if (motionOff()) paint();
}).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
resize();
refreshMotion();
