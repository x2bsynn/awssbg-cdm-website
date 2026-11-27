// Public Polar theme preference; no authentication or public-data requests.
const $ = (s) => document.querySelector(s);
const root = document.documentElement;
const themeToggle = $("#themeToggle");
function applyTheme(theme) {
  const dark = theme === "dark";
  root.dataset.theme = theme;
  themeToggle?.setAttribute("aria-pressed", String(dark));
  themeToggle?.setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode",
  );
  $("meta[name=theme-color]")?.setAttribute(
    "content",
    dark ? "#101e2d" : "#e6f0f5",
  );
}
applyTheme(root.dataset.theme === "dark" ? "dark" : "light");
let transitioning = false;
themeToggle?.addEventListener("click", () => {
  if (transitioning) return;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  const change = () => {
    applyTheme(next);
    try {
      localStorage.setItem("awssbg-theme", next);
    } catch {}
  };
  if (
    root.dataset.motion === "paused" ||
    !document.startViewTransition ||
    !CSS.supports("clip-path", "circle(100% at 0 0)") ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    change();
    return;
  }
  transitioning = true;
  root.classList.add("theme-changing");
  try {
    const transition = document.startViewTransition(change);
    transition.finished
      .catch(() => {})
      .finally(() => {
        transitioning = false;
        root.classList.remove("theme-changing");
      });
  } catch {
    change();
    transitioning = false;
    root.classList.remove("theme-changing");
  }
});
