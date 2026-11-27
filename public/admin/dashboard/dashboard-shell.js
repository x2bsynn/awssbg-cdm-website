/*
  Dashboard shell and overview module.
  Handles navigation, theme/sidebar state, the academic-year selector,
  Overview metrics, Settings, and shared table enhancement startup.
  Imports member, registration, report, and academic-year modules.
*/
import { getMembershipStatistics, getRecentRenewals } from "./members.js";
import { getRegistrationStatistics, getRecentRegistrations } from "./registrations.js";
import { escapeHtml, formatDate, getElementById, getLoadedDashboardData } from "./utilities.js";
import "./reports.js";
import { enhanceAllTables } from "./table-standard.js";
import {
  MANILA_TIME_ZONE,
  getCurrentAcademicYear,
  academicYearSelection,
  formatAcademicYearLabel,
  getAcademicYearDateRange,
  getAcademicYearOfDate,
  getTodayInManila,
  getOfficerSeatsForAcademicYear,
  getAcademicYearChoices,
} from "./ay.js";

// ==========================================
// SHARED HELPERS
// ==========================================
// Small helpers used throughout this file.
/**
 * Shortcut for finding one element by its id.
 *
 * @param {*} elementId - The id attribute of the element.
 * @returns {HTMLElement|null} The element or null.
 */

const rootElement = document.documentElement;
const browserStorage = {
  get: (storageKey, fallbackValue) => {
    try {
      return localStorage.getItem(storageKey) ?? fallbackValue;
    } catch {
      return fallbackValue;
    }
  },
  set: (storageKey, valueToSave) => {
    try {
      localStorage.setItem(storageKey, valueToSave);
    } catch {
      /* storage unavailable */
    }
  },
};

const ICONS = {
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  dash: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  tree: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  cal: '<path d="M8 2v4M16 2v4M3 10h18"/><rect width="18" height="18" x="3" y="4" rx="2"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  cap: '<path d="M21.42 10.92a1 1 0 0 0 0-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0zM22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  chart: '<path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>',
  sliders:
    '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  pencil:
    '<path d="M21.17 6.81a2.12 2.12 0 0 0-3-3L3.84 18.17a2 2 0 0 0-.5.83l-1.32 4.35 4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  "refresh-cw":
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/>',
  "arrow-up-right": '<path d="M7 7h10v10M7 17 17 7"/>',
  "arrow-down-right": '<path d="m7 7 10 10M17 7v10H7"/>',
  "calendar-clock":
    '<path d="M16 2v4M8 2v4M3 10h5M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><circle cx="16" cy="16" r="6"/><path d="M16 14v2l1 1"/>',
  "panel-left-close":
    '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M16 15l-3-3 3-3"/>',
  "panel-left-open":
    '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M14 9l3 3-3 3"/>',
  "calendar-days":
    '<path d="M8 2v4M16 2v4M3 10h18"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  "user-round":
    '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  network:
    '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8"/>',
  panel: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
};
/**
 * Builds the HTML for one Lucide-style icon (icons are drawn with SVG so no image files are needed).
 *
 * @param {*} iconName - A key of the ICONS table, for example "plus".
 * @returns {string} SVG markup.
 */
const createIconSvg = (iconName) =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[iconName]}</svg>`;

const NAVIGATION_ITEMS = [
  ["overview", "Overview", "dash"],
  ["organization", "Officers & Structure", "tree"],
  ["events", "Registration & Events", "cal"],
  ["members", "Members", "users"],
  ["reports", "Reports & Analytics", "chart"],
  ["settings", "Settings", "sliders"],
];
const OFFICE_NAMES = [
  "Executive",
  "Creatives",
  "Finance",
  "Technology",
  "Relations",
  "Marketing",
  "Operations",
];
let currentViewName = "overview";

/* ---------- icons, labels (progressive enhancement of dynamic markup) ---------- */
/*
  Hydrates icon placeholders and adds table-label metadata after dynamic markup
  is inserted. It also schedules this work through one MutationObserver.
*/
function addIconsAndTableLabels() {
  document.querySelectorAll("i[data-icon]").forEach((iconPlaceholder) => {
    if (!ICONS[iconPlaceholder.dataset.icon]) return;
    const templateElement = document.createElement("template");
    templateElement.innerHTML = createIconSvg(iconPlaceholder.dataset.icon);
    const svg = templateElement.content.firstChild;
    if (iconPlaceholder.className)
      svg.classList.add(...iconPlaceholder.className.split(" ").filter(Boolean));
    iconPlaceholder.replaceWith(svg);
  });
  // Tables become stacked cards on phones: every cell needs its column name.
  document.querySelectorAll("table").forEach((table) => {
    const heads = [...table.querySelectorAll("thead th")].map((th) =>
      th.textContent.trim(),
    );
    if (!heads.length) return;
    table.querySelectorAll("tbody tr").forEach((tr) =>
      [...tr.children].forEach((td, columnIndex) => {
        if (!td.dataset.label && heads[columnIndex]) td.dataset.label = heads[columnIndex];
      }),
    );
  });
}
let isIconRefreshQueued = false;
new MutationObserver(() => {
  if (isIconRefreshQueued) return;
  isIconRefreshQueued = true;
  requestAnimationFrame(() => {
    isIconRefreshQueued = false;
    addIconsAndTableLabels();
  });
}).observe(document.body, { childList: true, subtree: true });

/* ---------- theme & sidebar (persisted) ---------- */
/*
  Applies and persists the light/dark theme, including the viewport wave animation.
  It also updates the theme icon and browser theme-color meta value.
*/
let activeThemeTransition = null;

function applyTheme(themeName, animate = false) {
  if (themeName !== "dark" && themeName !== "light") return;
  if (activeThemeTransition) return;
  if (animate && themeName !== rootElement.dataset.theme &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      typeof document.startViewTransition === "function") {
    rootElement.classList.add("theme-wave");
    try {
      const transition = document.startViewTransition(() => commitTheme(themeName));
      activeThemeTransition = transition;
      const cleanUp = () => {
        activeThemeTransition = null;
        rootElement.classList.remove("theme-wave");
      };
      // A skipped transition still commits the theme in the update callback.
      transition.ready.catch(() => {});
      transition.finished.then(cleanUp, cleanUp);
      return;
    } catch {
      rootElement.classList.remove("theme-wave");
    }
  }
  // Older browsers and reduced-motion users can still switch themes immediately.
  commitTheme(themeName);
}

function commitTheme(themeName) {
  rootElement.dataset.theme = themeName;
  browserStorage.set("sbg-theme", themeName);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", themeName === "dark" ? "#1b161c" : "#fdf6f8");
  const themeToggleButton = getElementById("theme-toggle");
  if (themeToggleButton) {
    const nextThemeLabel = themeName === "dark" ? "Light mode" : "Dark mode";
    themeToggleButton.innerHTML = `${createIconSvg(themeName === "dark" ? "sun" : "moon")}<span class="nav-text">${nextThemeLabel}</span>`;
    themeToggleButton.setAttribute("aria-label", `Switch to ${themeName === "dark" ? "light" : "dark"} mode`);
    themeToggleButton.dataset.tip = nextThemeLabel;
  }
  if (currentViewName === "settings") renderSettings();
}
/*
  Applies the expanded/collapsed sidebar state and persists it locally.
  The sidebar label and collapse icon are updated together.
*/
function applySidebarState(sidebarState) {
  rootElement.dataset.sidebar = sidebarState;
  browserStorage.set("sbg-sidebar", sidebarState);
  const sidebarToggleButton = getElementById("sidebar-toggle");
  if (sidebarToggleButton) {
    const open = sidebarState === "expanded";
    sidebarToggleButton.setAttribute("aria-expanded", String(open));
    sidebarToggleButton.setAttribute("aria-label", open ? "Collapse sidebar" : "Expand sidebar");
    sidebarToggleButton.dataset.tip = open ? "Collapse sidebar" : "Expand sidebar";
    sidebarToggleButton.innerHTML = createIconSvg(open ? "panel-left-close" : "panel-left-open");
  }
  if (currentViewName === "settings") renderSettings();
}
/**
 * Closes the slide-in navigation drawer used on phones and small tablets.
 */
const closeMobileNavigation = () => {
  delete rootElement.dataset.nav;
};
document.addEventListener("keydown", (keyboardEvent) => {
  if (keyboardEvent.key === "Escape") closeMobileNavigation();
});

/**
 * Watches the page for new tables (for example inside a dialog) and gives each one
 * search, sorting, filters and paging through table-standard.js.
 */
const tableObserver = new MutationObserver(() => {
  requestAnimationFrame(() => enhanceAllTables());
});
tableObserver.observe(document.body, { childList: true, subtree: true });

/* ---------- navigation ---------- */
// Two pages (the tree and the directory) live under one sidebar entry,
// so both of them highlight the "Officers & Structure" menu item.
const NAVIGATION_ITEM_BY_VIEW = { structure: "organization", officers: "organization" };

// Every page name that may appear in the address bar after the "#".
const KNOWN_VIEW_NAMES = new Set([
  ...NAVIGATION_ITEMS.map(([viewId]) => viewId),
  ...Object.keys(NAVIGATION_ITEM_BY_VIEW),
]);

/**
 * Reads the page name from the address bar, for example ".../dashboard.html#members".
 * This is what makes links, the Back/Forward buttons and page refreshes land on
 * the right page without reloading the whole site.
 *
 * @returns {string|null} A known page name, or null when there is none.
 */
function getViewNameFromAddressBar() {
  const requestedViewName = window.location.hash.replace(/^#\/?/, "");
  return KNOWN_VIEW_NAMES.has(requestedViewName) ? requestedViewName : null;
}

/**
 * Shows another dashboard page: highlights its menu item, tells dashboard.js
 * to display the matching section, and records the move in the browser history.
 *
 * @param {string} viewName - The page to open, for example "members".
 * @param {{shouldUpdateHistory?: boolean}} [options] - Pass false when the move
 *   came FROM the history (Back/Forward) so we do not add the same entry again.
 */
function navigateToView(viewName, { shouldUpdateHistory = true } = {}) {
  const next = viewName;
  currentViewName = next;
  document.querySelectorAll("#nav-list .nav-item").forEach((navigationButton) => {
    const isActivePage = navigationButton.dataset.view === (NAVIGATION_ITEM_BY_VIEW[next] ?? next);
    navigationButton.classList.toggle("active", isActivePage);
    isActivePage
      ? navigationButton.setAttribute("aria-current", "page")
      : navigationButton.removeAttribute("aria-current");
  });
  closeMobileNavigation();
  // dashboard.js listens for this event and shows the matching section.
  document.dispatchEvent(new CustomEvent("sbg:navigate", { detail: next }));
  if (next === "settings") renderSettings();
  if (next === "overview") renderOverview();

  // Add a history entry so the browser's Back button returns to the previous page.
  const newHash = `#${next}`;
  if (shouldUpdateHistory && window.location.hash !== newHash) {
    window.history.pushState({ viewName: next }, "", newHash);
  }
  scrollTo({ top: 0 });
}

// Back and Forward buttons: open the page named in the address bar, without
// adding another history entry.
window.addEventListener("popstate", () => {
  navigateToView(getViewNameFromAddressBar() ?? "overview", {
    shouldUpdateHistory: false,
  });
});

/* ---------- academic-year picker ---------- */
/*
  Builds the custom Academic Year menu from centralized academic-year choices.
  The selected year updates shared ayState and all dependent dashboard views.
*/
function renderAcademicYearSelector() {
  const academicYearSelect = getElementById("ay-select");
  if (!academicYearSelect) return;
  const data = window.__sbgData ?? { officers: [] };
  const years = new Set([getCurrentAcademicYear(), academicYearSelection.selected]);
  getAcademicYearChoices().forEach((year) => years.add(year));
  data.officers.forEach((officer) =>
    (officer.positions ?? []).forEach((position) => position.year && years.add(position.year)),
  );
  const ordered = [...years].sort().reverse();
  academicYearSelect.innerHTML = ordered
    .map(
      (academicYear) =>
        `<option value="${academicYear}">${formatAcademicYearLabel(academicYear)}${academicYear === getCurrentAcademicYear() ? " · current" : ""}</option>`,
    )
    .join("");
  academicYearSelect.value = academicYearSelection.selected;
  const label = getElementById("ay-label");
  if (label)
    label.textContent = `A.Y. ${formatAcademicYearLabel(academicYearSelection.selected).replace(/^A\.Y\.\s*/i, "")}${academicYearSelection.selected === getCurrentAcademicYear() ? " · Current" : ""}`;
  const menu = getElementById("ay-menu");
  if (!menu) return;
  menu.innerHTML = ordered
    .map((academicYear) => {
      const text = `A.Y. ${formatAcademicYearLabel(academicYear).replace(/^A\.Y\.\s*/i, "")}${academicYear === getCurrentAcademicYear() ? " · Current" : ""}`;
      return `<button type="button" class="ay-option${academicYear === academicYearSelection.selected ? " selected" : ""}" role="option" aria-selected="${academicYear === academicYearSelection.selected}" data-ay="${academicYear}"><span>${text}</span><i data-icon="check"></i></button>`;
    })
    .join("");
  menu.querySelectorAll("[data-ay]").forEach((option) => {
    option.addEventListener("click", () => {
      academicYearSelection.selected = option.dataset.ay;
      academicYearSelect.value = academicYearSelection.selected;
      academicYearSelect.dispatchEvent(new Event("change", { bubbles: true }));
      renderAcademicYearSelector();
      closeAcademicYearMenu();
    });
  });
}

/**
 * Places the academic-year menu directly under its button and keeps it inside the screen.
 */
function positionAcademicYearMenu() {
  const trigger = getElementById("ay-trigger");
  const menu = getElementById("ay-menu");
  if (!trigger || !menu || menu.hidden) return;
  const rect = trigger.closest(".ay-field").getBoundingClientRect();
  const menuWidth = Math.max(rect.width, 220);
  const menuHeight = Math.min(menu.scrollHeight || 280, 280);
  let top = rect.bottom + 8;
  if (top + menuHeight > window.innerHeight - 8)
    top = Math.max(8, rect.top - menuHeight - 8);
  menu.style.width = `${menuWidth}px`;
  menu.style.left = `${Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.left))}px`;
  menu.style.top = `${top}px`;
}

/**
 * Closes the academic-year menu and returns focus to its button.
 */
function closeAcademicYearMenu() {
  const trigger = getElementById("ay-trigger");
  const menu = getElementById("ay-menu");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  if (menu) {
    menu.hidden = true;
    const field = menu.closest(".ay-field");
    if (field && menu.parentElement !== field) field.append(menu);
  }
}

// ==========================================
// OVERVIEW NUMBERS
// ==========================================

/**
 * Calculates every number shown on the Overview page for the selected academic year.
 *
 * Nothing is typed in by hand: all values come from the officers and events that
 * dashboard.js loaded from the API, so the page always matches the real records.
 *
 * @returns {object} Officer counts, event counts and a month-by-month event list.
 *   (Short key names such as "exec" are kept because renderOverview() reads them.)
 */
function calculateOverviewMetrics() {
  const dashboardData = getLoadedDashboardData();
  const academicYear = academicYearSelection.selected;
  const todayDate = getTodayInManila();
  const { start: academicYearStart, end: academicYearEnd } = getAcademicYearDateRange(academicYear);

  // Every officer position that belongs to this academic year (advisers always count).
  const officerSeats = getOfficerSeatsForAcademicYear(dashboardData.officers, academicYear);
  // Advisers are shown separately, so student officers are everyone else.
  const studentOfficerSeats = officerSeats.filter((seat) => !seat.isAdviser);

  // Counts each officer once, even if they hold several positions.
  const countUniqueOfficers = (seats) =>
    new Set(seats.map((seat) => seat.officer.id)).size;

  const officersPerOffice = OFFICE_NAMES.map((officeName) => [
    officeName,
    countUniqueOfficers(
      studentOfficerSeats.filter((seat) => seat.position.office === officeName),
    ),
  ]);

  // The three leadership roles the Overview reports on.
  const hasPositionTitle = (normalizedTitle) =>
    officerSeats.some(
      (seat) => String(seat.position.title).trim().toLowerCase() === normalizedTitle,
    );
  const filledLeadershipRoleCount = [
    officerSeats.some((seat) => seat.isAdviser),
    hasPositionTitle("student builder group lead"),
    hasPositionTitle("executive director"),
  ].filter(Boolean).length;

  // How many positions each officer holds (used to find officers with several).
  const positionCountByOfficerId = {};
  studentOfficerSeats.forEach((seat) => {
    positionCountByOfficerId[seat.officer.id] =
      (positionCountByOfficerId[seat.officer.id] ?? 0) + 1;
  });

  // Events that fall inside the academic year (August 1 to July 31).
  const eventsInAcademicYear = dashboardData.events.filter(
    (eventRecord) =>
      eventRecord.date >= academicYearStart && eventRecord.date <= academicYearEnd,
  );
  const publishedEvents = eventsInAcademicYear.filter(
    (eventRecord) => eventRecord.status === "published",
  );

  // One slot per month, August first, so the chart follows the academic calendar.
  const months = Array.from({ length: 12 }, (unusedItem, monthIndex) => {
    const calendarMonth = ((7 + monthIndex) % 12) + 1;
    // January to July fall in the second calendar year of the academic year.
    const calendarYear = Number(academicYear.slice(0, 4)) + (calendarMonth < 8 ? 1 : 0);
    return {
      monthNumber: calendarMonth,
      key: `${calendarYear}-${String(calendarMonth).padStart(2, "0")}`,
      eventCount: 0,
    };
  });
  eventsInAcademicYear.forEach((eventRecord) => {
    const matchingMonth = months.find((monthSlot) =>
      eventRecord.date.startsWith(monthSlot.key),
    );
    if (matchingMonth) matchingMonth.eventCount += 1;
  });

  return {
    officers: countUniqueOfficers(studentOfficerSeats),
    exec: countUniqueOfficers(
      studentOfficerSeats.filter((seat) => seat.position.office === "Executive"),
    ),
    perOffice: officersPerOffice,
    staffed: officersPerOffice.filter(([, officerCount]) => officerCount).length,
    leadership: filledLeadershipRoleCount,
    multi: Object.values(positionCountByOfficerId).filter((positionCount) => positionCount > 1).length,
    total: eventsInAcademicYear.length,
    drafts: eventsInAcademicYear.filter((eventRecord) => eventRecord.status === "draft").length,
    upcoming: publishedEvents.filter((eventRecord) => eventRecord.date > todayDate),
    ongoing: publishedEvents.filter((eventRecord) => eventRecord.date === todayDate).length,
    completed: publishedEvents.filter((eventRecord) => eventRecord.date < todayDate).length,
    months,
  };
}

/*
  Renders the Overview cards, charts, ledger rows, upcoming events, and recent activity.
  It intentionally contains no Create Event or Add Officer actions.
*/
function renderOverview() {
  const live = getElementById("overview-live");
  if (!live) return;
  const evAY = (window.__sbgData?.events ?? []).filter(
      (eventRecord) => eventRecord.date && getAcademicYearOfDate(eventRecord.date) === academicYearSelection.selected,
    ),
    registrationStatistics = getRegistrationStatistics(evAY);
  const feed = [...getRecentRenewals(8), ...getRecentRegistrations(evAY, 8)]
    .sort((firstActivity, secondActivity) => secondActivity.date.localeCompare(firstActivity.date))
    .slice(0, 8);
  const overviewMetrics = calculateOverviewMetrics(),
    memberStatistics = getMembershipStatistics(),
    academicYear = academicYearSelection.selected,
    largestOfficeOfficerCount = Math.max(1, ...overviewMetrics.perOffice.map(([, officerCount]) => officerCount)),
    largestMonthlyEventCount = Math.max(1, ...overviewMetrics.months.map((monthSlot) => monthSlot.eventCount));
  const rows = [
    ["Upcoming events", overviewMetrics.upcoming.length, "events"],
    ["Ongoing today", overviewMetrics.ongoing, "events"],
    ["Completed events", overviewMetrics.completed, "events"],
    ["Draft events", overviewMetrics.drafts, "events"],
    ["Events this A.Y.", overviewMetrics.total, "events"],
    ["Leadership seats filled", `${overviewMetrics.leadership}/3`, "structure"],
    [`Offices staffed`, `${overviewMetrics.staffed}/${OFFICE_NAMES.length}`, "structure"],
    ["Offices without officers", OFFICE_NAMES.length - overviewMetrics.staffed, "structure"],
    ["Officers on multiple positions", overviewMetrics.multi, "officers"],
  ];
  live.innerHTML = `
    <div class="ov-hero">
      <div class="ov-lead"><span class="mono-label">Current officers · ${formatAcademicYearLabel(academicYear)}</span><strong class="ov-big">${overviewMetrics.officers}</strong>
        <p>${overviewMetrics.exec} in the Executive Office · ${overviewMetrics.staffed} of ${OFFICE_NAMES.length} offices staffed</p>
        <button class="link-btn" data-go="structure">Open organizational structure →</button></div>
      <div class="ov-ledger">${rows.map(([rowLabel, rowValue, rowTargetView]) => `<button class="ov-row" data-go="${rowTargetView}"><span>${rowLabel}</span><i></i><b>${rowValue}</b></button>`).join("")}</div>
    </div>
    <div class="ov-grid">
      <section class="chart-card"><h2>Officers by office</h2>${overviewMetrics.perOffice
        .map(
          ([officeName, officerCount]) =>
            `<div class="bar-row${officerCount ? "" : " vacant"}" data-tip="${officerCount} officer${officerCount === 1 ? "" : "s"}"><span>${officeName}</span><div><b style="width:${(officerCount / largestOfficeOfficerCount) * 100}%"></b></div><em>${officerCount || "—"}</em></div>`,
        )
        .join("")}</section>
      <section class="chart-card"><h2>Events per month · ${formatAcademicYearLabel(academicYear)}</h2><div class="months">${overviewMetrics.months
        .map(
          (monthSlot) =>
            `<div data-tip="${formatDate(monthSlot.key + "-01", { month: "long", year: "numeric" })}: ${monthSlot.eventCount} event${monthSlot.eventCount === 1 ? "" : "s"}"><b style="--v:${monthSlot.eventCount / largestMonthlyEventCount}" data-n="${monthSlot.eventCount || ""}"></b><i>${formatDate(monthSlot.key + "-01", { month: "short" })}</i></div>`,
        )
        .join("")}</div></section>
    </div>
    <div class="ov-grid">
      <section class="ov-block"><h2>Upcoming events</h2>${
        overviewMetrics.upcoming.length
          ? `<ul class="timeline">${[...overviewMetrics.upcoming]
              .sort((firstEvent, secondEvent) => firstEvent.date.localeCompare(secondEvent.date))
              .slice(0, 5)
              .map(
                (upcomingEvent) => `
        <li><time><b>${formatDate(upcomingEvent.date, { day: "numeric" })}</b>${formatDate(upcomingEvent.date, { month: "short" })}</time>
        <div><strong>${escapeHtml(upcomingEvent.title)}</strong><span>${escapeHtml([upcomingEvent.time, upcomingEvent.location].filter(Boolean).join(" · "))}</span></div>
        <button class="button button-light" data-event="${escapeHtml(upcomingEvent.title)}">View</button></li>`,
              )
              .join("")}</ul>`
          : `<p class="empty-line">No upcoming published events in ${formatAcademicYearLabel(academicYear)}.</p>`
      }</section>
      <section class="ov-block"><h2>Membership <span class="sample-tag">sample data</span></h2>
        <div class="ov-ledger">${[
          ["Active members", memberStatistics.active],
          ["Renewal rate", memberStatistics.renewalRate == null ? "—" : memberStatistics.renewalRate + "%"],
          ["New members", memberStatistics.newMemberCount],
          ["Returning members", memberStatistics.returning],
          ["Inactive members", memberStatistics.inactive],
          [
            "Growth vs previous A.Y.",
            memberStatistics.growth == null ? "—" : (memberStatistics.growth > 0 ? "+" : "") + memberStatistics.growth,
          ],
        ]
          .map(
            ([rowLabel, rowValue]) =>
              `<button class="ov-row" data-go="members"><span>${rowLabel}</span><i></i><b>${rowValue}</b></button>`,
          )
          .join("")}</div>
        </section>
    </div>
    <div class="ov-grid">
      <section class="ov-block"><h2>Registrations &amp; engagement <span class="sample-tag">sample data</span></h2>
        <div class="ov-ledger">${[
          ["Total registrations", registrationStatistics.total],
          ["Confirmed", registrationStatistics.confirmed],
          ["Pending", registrationStatistics.pending],
          ["Average per event", registrationStatistics.averagePerEvent.toFixed(1)],
          ["Unique participants", registrationStatistics.uniqueParticipants],
          [
            "Participation rate",
            memberStatistics.active ? Math.round((registrationStatistics.uniqueParticipants / memberStatistics.active) * 100) + "%" : "—",
          ],
          ["In 2+ events", registrationStatistics.multiEventParticipants],
          ["Avg events per participant", registrationStatistics.averageEventsPerParticipant.toFixed(1)],
          ["Most participated", registrationStatistics.mostParticipatedEvent ? `${registrationStatistics.mostParticipatedEvent.title} (${registrationStatistics.mostParticipatedEvent.confirmedCount})` : "—"],
        ]
          .map(
            ([rowLabel, rowValue]) =>
              `<button class="ov-row" data-go="events"><span>${rowLabel}</span><i></i><b>${rowValue}</b></button>`,
          )
          .join("")}</div></section>
      <section class="ov-block"><h2>Recent activity <span class="sample-tag">sample data</span></h2>${feed.length ? `<ul class="feed">${feed.map((activityItem) => `<li><time>${formatDate(activityItem.date, { month: "short", day: "numeric" })}</time><span>${escapeHtml(activityItem.text)}</span></li>`).join("")}</ul>` : '<p class="empty-line">No recent activity.</p>'}</section>
    </div>`;
}

/* ---------- settings ---------- */
function renderSettings() {
  const settingsView = getElementById("settings-view");
  if (!settingsView) return;
  const currentAcademicYearRange = getAcademicYearDateRange(getCurrentAcademicYear());
  settingsView.innerHTML = `<div class="page-head"><div><div class="eyebrow">Configuration</div><h1>Settings</h1></div></div>
    <section class="set-group"><h2>Administrator profile</h2><p>From your signed-in account. Access is limited to the Cognito Admins group; finer roles (Super Admin, Officer) need backend support.</p>
      <p><strong>${escapeHtml(getElementById("profile-name")?.textContent)}</strong><br>${escapeHtml(getElementById("profile-email")?.textContent)}</p></section>
    <section class="set-group"><h2>Organization</h2><p><strong>AWS Student Builder Group – Colegio de Muntinlupa</strong><br>Academic calendar: August – July · Time zone: Asia/Manila (PHT)</p></section>
    <section class="set-group"><h2>Current academic year</h2><p>Detected automatically; the year changes on August 1. No manual update is required.</p>
      <p><strong>${formatAcademicYearLabel(getCurrentAcademicYear())}</strong> · ${formatDate(currentAcademicYearRange.start, { month: "long", year: "numeric" })} – ${formatDate(currentAcademicYearRange.end, { month: "long", year: "numeric" })}</p></section>`;
}

/* ---------- wiring ---------- */
function initializeDashboardShell() {
  getElementById("nav-list").innerHTML = NAVIGATION_ITEMS.map(
    ([viewId, label, iconName, soon]) =>
      `<button type="button" class="nav-item${viewId === currentViewName ? " active" : ""}${soon ? " is-soon" : ""}" data-view="${viewId}" data-tip="${label}"${soon ? ' disabled aria-disabled="true" title="Coming in a later phase"' : ""}>${createIconSvg(iconName)}<span class="nav-text">${label}</span>${soon ? '<em class="soon">Soon</em>' : ""}</button>`,
  ).join("");
  applyTheme(rootElement.dataset.theme || "dark");
  applySidebarState(rootElement.dataset.sidebar || "expanded");
  renderAcademicYearSelector();
  const todayDateText = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  getElementById("ov-date").textContent = `${todayDateText} · PHT`;

  getElementById("nav-list").addEventListener("click", (clickEvent) => {
    const clickedNavigationButton = clickEvent.target.closest("[data-view]");
    if (clickedNavigationButton && !clickedNavigationButton.disabled) navigateToView(clickedNavigationButton.dataset.view);
  });
  getElementById("theme-toggle").addEventListener("click", () =>
    applyTheme(rootElement.dataset.theme === "dark" ? "light" : "dark", true),
  );
  getElementById("nav-open").addEventListener("click", () => {
    rootElement.dataset.nav = "open";
  });
  getElementById("nav-scrim").addEventListener("click", closeMobileNavigation);
  getElementById("sidebar-toggle").addEventListener("click", () =>
    applySidebarState(rootElement.dataset.sidebar === "collapsed" ? "expanded" : "collapsed"),
  );
  const brandToggle = getElementById("sidebar-brand-toggle");
  const toggleSidebarFromBrand = () =>
    applySidebarState(rootElement.dataset.sidebar === "collapsed" ? "expanded" : "collapsed");
  brandToggle?.addEventListener("click", toggleSidebarFromBrand);
  brandToggle?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSidebarFromBrand();
    }
  });
  getElementById("ay-select").addEventListener("change", (changeEvent) => {
    academicYearSelection.selected = changeEvent.target.value;
    document.dispatchEvent(new Event("sbg:ay"));
    renderOverview();
  });
  getElementById("ay-trigger").addEventListener("click", (clickEvent) => {
    clickEvent.stopPropagation();
    const menu = getElementById("ay-menu");
    const opening = menu.hidden;
    closeAcademicYearMenu();
    if (opening) {
      menu.hidden = false;
      document.body.append(menu);
      getElementById("ay-trigger").setAttribute("aria-expanded", "true");
      positionAcademicYearMenu();
      if (clickEvent.detail === 0)
        menu
          .querySelector(".ay-option.selected")
          ?.focus({ preventScroll: true });
    }
  });
  getElementById("ay-trigger").addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key === "ArrowDown" || keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault();
      getElementById("ay-trigger").click();
    }
  });
  getElementById("ay-menu").addEventListener("keydown", (keyboardEvent) => {
    const options = [...getElementById("ay-menu").querySelectorAll(".ay-option")];
    const index = options.indexOf(document.activeElement);
    if (keyboardEvent.key === "Escape") {
      keyboardEvent.preventDefault();
      closeAcademicYearMenu();
      getElementById("ay-trigger").focus({ preventScroll: true });
    } else if (keyboardEvent.key === "ArrowDown") {
      keyboardEvent.preventDefault();
      options[(index + 1) % options.length]?.focus({ preventScroll: true });
    } else if (keyboardEvent.key === "ArrowUp") {
      keyboardEvent.preventDefault();
      options[(index - 1 + options.length) % options.length]?.focus({
        preventScroll: true,
      });
    }
  });
  window.addEventListener("resize", positionAcademicYearMenu);
  window.addEventListener("scroll", positionAcademicYearMenu, true);

  document.addEventListener("click", (clickEvent) => {
    if (!clickEvent.target.closest(".ay-field")) closeAcademicYearMenu();
  });

  document.addEventListener("click", (clickEvent) => {
    const clickedElement = clickEvent.target.closest("[data-go],[data-event],[data-act],[data-set]");
    if (!clickedElement) return;
    if (clickedElement.dataset.go) navigateToView(clickedElement.dataset.go);
    else if (clickedElement.dataset.event) {
      navigateToView("events");
      document.querySelectorAll(".standard-table-toolbar input[type='search']").forEach((searchInput) => {
        searchInput.value = clickedElement.dataset.event;
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
    } else if (clickedElement.dataset.set === "theme") applyTheme(clickedElement.dataset.val, true);
    else if (clickedElement.dataset.set === "sidebar") applySidebarState(clickedElement.dataset.val);
    else if (clickedElement.dataset.act === "new-event") {
      navigateToView("events");
      getElementById("new-event-button").click();
    } else if (clickedElement.dataset.act === "new-officer") {
      navigateToView("officers");
      getElementById("new-officer-button").click();
    } else if (clickedElement.dataset.act === "reset-ay") {
      academicYearSelection.selected = getCurrentAcademicYear();
      renderAcademicYearSelector();
      document.dispatchEvent(new Event("sbg:ay"));
      renderOverview();
    }
  });
  document.addEventListener("sbg:go", (customEvent) => navigateToView(customEvent.detail));
  document.addEventListener("sbg:setay", (customEvent) => {
    academicYearSelection.selected = customEvent.detail;
    renderAcademicYearSelector();
    document.dispatchEvent(new Event("sbg:ay"));
    renderOverview();
  });
  document.addEventListener("sbg:data", () => {
    renderAcademicYearSelector();
    renderOverview();
  });
  document.addEventListener("sbg:toast", () => renderOverview());
  renderOverview();

  // Open the page named in the address bar (a bookmarked or refreshed link),
  // and make the first history entry carry the page name too.
  const initialViewName = getViewNameFromAddressBar() ?? "overview";
  navigateToView(initialViewName, { shouldUpdateHistory: false });
  window.history.replaceState({ viewName: initialViewName }, "", `#${initialViewName}`);
}

// ==========================================
// STYLED DROPDOWNS
// ==========================================
// Replaces the browser's plain <select> menus with dropdowns that match the
// dashboard theme. The original <select> stays hidden so forms still work.
/**
 * Turns one <select> element into a styled dropdown (button + menu) with keyboard support.
 *
 * @param {*} select - The <select> element to enhance.
 */

function enhanceNativeDropdown(select) {
  if (!select || select.dataset.genericEnhanced === "true") return;
  if (
    select.id === "ay-select" ||
    select.closest("#officer-form-panel") ||
    select.closest(".officer-select") ||
    select.closest(".officer-birthdate-calendar")
  )
    return;
  if (select.classList.contains("custom-select-source-hidden")) return;
  if (select.disabled) return;

  select.dataset.genericEnhanced = "true";
  select.classList.add("custom-select-source-hidden");
  const wrap = document.createElement("div");
  wrap.className = "generic-select-wrap";
  wrap.setAttribute(
    "aria-label",
    select.getAttribute("aria-label") ||
      select.labels?.[0]?.textContent ||
      "Dropdown",
  );
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "generic-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const label = document.createElement("span");
  label.className = "generic-select-label";
  const chevron = document.createElement("i");
  chevron.dataset.icon = "chevron-down";
  chevron.className = "generic-select-chevron";
  trigger.append(label, chevron);

  const menu = document.createElement("div");
  menu.className = "generic-select-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  menu._ownerWrap = wrap;

  const close = () => {
    menu.hidden = true;
    wrap.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
    if (menu.parentElement !== wrap) wrap.append(menu);
  };
  const position = () => {
    if (menu.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const width = rect.width;
    const height = Math.min(menu.scrollHeight || 280, 280);
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 8)
      top = Math.max(8, rect.top - height - 8);
    const left = Math.max(
      8,
      Math.min(window.innerWidth - width - 8, rect.left),
    );
    menu.style.width = `${width}px`;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };
  const sync = () => {
    const current = select.options[select.selectedIndex];
    label.textContent = current?.textContent || "Select";
  };

  function renderOptions() {
    menu.replaceChildren();
    [...select.options].forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "generic-select-option";
      item.dataset.value = option.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));
      item.classList.toggle("selected", option.selected);
      item.disabled = option.disabled;
      const text = document.createElement("span");
      text.textContent = option.textContent;
      const check = document.createElement("i");
      check.dataset.icon = "check";
      item.append(text, check);
      item.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        sync();
        close();
        trigger.focus({ preventScroll: true });
      });
      menu.append(item);
    });
  }

  sync();
  renderOptions();
  select.parentNode.insertBefore(wrap, select);
  wrap.append(trigger, select, menu);

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const opening = menu.hidden;
    document.querySelectorAll(".generic-select-menu").forEach((other) => {
      if (other !== menu) {
        other.hidden = true;
        const otherWrap = other._ownerWrap;
        otherWrap?.classList.remove("open");
        otherWrap
          ?.querySelector(".generic-select-trigger")
          ?.setAttribute("aria-expanded", "false");
        if (otherWrap && other.parentElement !== otherWrap)
          otherWrap.append(other);
      }
    });
    menu.hidden = !opening;
    wrap.classList.toggle("open", opening);
    trigger.setAttribute("aria-expanded", String(opening));
    if (opening) {
      renderOptions();
      (wrap.closest("dialog") || document.body).append(menu);
      position();
      if (event.detail === 0)
        menu
          .querySelector(".generic-select-option.selected")
          ?.focus({ preventScroll: true });
    }
  });
  trigger.addEventListener("keydown", (event) => {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      trigger.click();
    } else if (event.key === "Escape") close();
  });
  menu.addEventListener("keydown", (event) => {
    const items = [
      ...menu.querySelectorAll(".generic-select-option:not(:disabled)"),
    ];
    const index = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      trigger.focus({ preventScroll: true });
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus({ preventScroll: true });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus({
        preventScroll: true,
      });
    }
  });
  select.addEventListener("change", () => {
    sync();
    renderOptions();
  });
  trigger._genericMenu = { close, position };
}

/**
 * Enhances every <select> found under a starting element. Safe to call repeatedly.
 *
 * @param {*} rootElement - Where to search; defaults to the whole page.
 */
function enhanceNativeDropdowns(root = document) {
  root.querySelectorAll("select").forEach(enhanceNativeDropdown);
  requestAnimationFrame(() => addIconsAndTableLabels());
}

document.addEventListener("click", (event) => {
  if (event.target.closest(".generic-select-wrap") ||
      [...document.querySelectorAll(".generic-select-menu")].some((menu) => menu.contains(event.target))) return;
  document.querySelectorAll(".generic-select-menu").forEach((menu) => {
    menu.hidden = true;
    const wrap = menu._ownerWrap;
    wrap?.classList.remove("open");
    wrap
      ?.querySelector(".generic-select-trigger")
      ?.setAttribute("aria-expanded", "false");
    if (wrap && menu.parentElement !== wrap) wrap.append(menu);
  });
});

/**
 * Enhances <select> elements that appear later (for example inside new dialogs).
 */
const genericDropdownObserver = new MutationObserver(() =>
  enhanceNativeDropdowns(),
);
genericDropdownObserver.observe(document.body, {
  childList: true,
  subtree: true,
});
window.addEventListener("resize", () => {
  document
    .querySelectorAll(".generic-select-wrap.open")
    .forEach((wrap) =>
      wrap.querySelector(".generic-select-trigger")._genericMenu?.position(),
    );
});
window.addEventListener(
  "scroll",
  () => {
    document
      .querySelectorAll(".generic-select-wrap.open")
      .forEach((wrap) =>
        wrap.querySelector(".generic-select-trigger")._genericMenu?.position(),
      );
  },
  true,
);

addIconsAndTableLabels();
initializeDashboardShell();
enhanceNativeDropdowns();
addIconsAndTableLabels();
