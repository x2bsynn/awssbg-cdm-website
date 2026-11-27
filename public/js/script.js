import "./shared-sky.js";
import {
  partners,
  membershipUrl,
  organizationTimeline,
  mascotFraming,
  eventCovers,
} from "./public-content.js";
import { directors, officers, members } from "./public-roster.js";
const { pages, sections } = globalThis.AWSSBG_SITE_CONFIG || {
  pages: {
    about: false,
    events: false,
    directors: false,
    officers: false,
    partners: false,
    contact: false,
  },
  sections: {
    about: false,
    mascots: false,
    events: false,
    partners: false,
    join: false,
    members: false,
  },
};
const $ = (s) => document.querySelector(s);
const root = document.documentElement;
const API_URL =
  "https://xxbmakdu4d.execute-api.us-east-1.amazonaws.com/prod/events";
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};
const year = $("#currentYear");
if (year) year.textContent = new Date().getFullYear();
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
const menu = $("#menuToggle"),
  nav = $("#navMenu");
function setMenu(open) {
  nav?.classList.toggle("is-open", open);
  menu?.setAttribute("aria-expanded", String(open));
  menu?.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
}
menu?.addEventListener("click", () =>
  setMenu(menu.getAttribute("aria-expanded") !== "true"),
);
nav
  ?.querySelectorAll("a")
  .forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menu?.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".site-header")) setMenu(false);
});
matchMedia("(min-width: 1251px)").addEventListener("change", () =>
  setMenu(false),
);
if (nav) {
  const current = location.pathname;
  nav.querySelectorAll("a").forEach((a) => {
    if (current !== "/" && a.getAttribute("href") === current)
      a.setAttribute("aria-current", "page");
  });
}
function safeImage(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const url = new URL(value, location.origin);
    return url.protocol === "https:" ||
      (url.origin === location.origin && url.protocol === "http:")
      ? url.href
      : null;
  } catch {
    return null;
  }
}
// Keep both the sections and navigation links hidden until real content exists.
function reveal(kind, sectionId) {
  if (pages[kind] === false) return;
  const section = document.getElementById(sectionId);
  if (section && !section.hasAttribute("data-manually-hidden"))
    section.hidden = false;
}
function renderPartners() {
  const valid = partners.filter(
    (p) =>
      p && typeof p.name === "string" && p.name.trim() && safeImage(p.logo),
  );
  if (!valid.length) return;
  const grid = $("#partnerGalaxy");
  Promise.all(
    valid.map(
      (p) =>
        new Promise((resolve) => {
          const img = el("img");
          img.alt = p.name;
          img.onload = () => resolve({ p, img });
          img.onerror = () => resolve(null);
          img.src = safeImage(p.logo);
        }),
    ),
  ).then((results) => {
    const loaded = results.filter(Boolean);
    if (!loaded.length) return;
    if (grid) {
      $("#partnerEmpty")?.setAttribute("hidden", "");
      grid.replaceChildren();
      for (const { p, img } of loaded) {
        const node = el("figure", "partner-node");
        const bubble = el("div", "partner-logo");
        if (p.darkLogo) bubble.classList.add("partner-logo-dark");
        bubble.append(img);
        node.append(bubble);
        grid.append(node);
      }
    }
    reveal("partners", "partners");
  });
}
// The same portrait component is used for every public person.
function focal(value) {
  return typeof value === "string" && /^\d+(?:\.\d+)?%$/.test(value)
    ? `${Math.min(100, parseFloat(value))}%`
    : "50%";
}
function personCard(person) {
  const card = el("article", "director-card person-card");
  card.tabIndex = 0;
  card.dataset.group = person.roleGroup || "officer";
  const img = el("img");
  img.src = safeImage(person.image) || "/assets/public-design/portrait-1.svg";
  img.alt = `Portrait of ${person.name}`;
  img.loading = "lazy";
  img.width = 900;
  img.height = 1200;
  img.style.objectPosition = `${focal(person.focalX)} ${focal(person.focalY)}`;
  img.addEventListener(
    "error",
    () => {
      img.src = "/assets/public-design/portrait-1.svg";
    },
    { once: true },
  );
  const info = el("div", "director-info");
  if (
    person.roleGroup === "lead" &&
    /^(executive|deputy(?: executive)?) director$/i.test(person.position.trim())
  ) {
    const label = /^deputy/i.test(person.position) ? "Co-Lead" : "Lead";
    info.append(el("span", "director-hover-label", label));
  }
  info.append(el("h3", "", person.name), el("p", "", person.position));
  card.append(img, info);
  return card;
}
function validPeople(records) {
  return records.filter(
    (o) =>
      o && [o.name, o.position].every((v) => typeof v === "string" && v.trim()),
  );
}
function renderOfficers() {
  const list = $("#officerList");
  if (!list) return;
  const roster = validPeople(officers).filter(
    (o) => typeof o.office === "string" && o.office.trim(),
  );
  const groups = new Map();
  roster.forEach((o) => {
    if (!groups.has(o.office)) groups.set(o.office, []);
    groups.get(o.office).push(o);
  });
  if (!roster.length && !members.length) {
    const empty = $("#peopleUnavailable");
    if (empty) empty.hidden = false;
  } else {
    reveal("officers", "officers");
  }
  for (const [office, people] of groups) {
    const section = el("section", "office");
    const heading = el("div", "office-heading");
    heading.append(el("h3", "", office));
    const grid = el("div", "officer-grid");
    grid.append(...people.map(personCard));
    section.append(heading, grid);
    list.append(section);
  }
  const memberList = $("#memberList");
  const memberRoster = validPeople(members);
  if (sections.members !== false && memberList && memberRoster.length) {
    memberList.replaceChildren(...memberRoster.map(personCard));
    $("#membersSection").hidden = false;
  }
}
const dateFormat = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "long",
  timeZone: "Asia/Manila",
});
function eventDay(value) {
  if (!value) return null;
  const raw = String(value);
  const match = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const d = new Date(match ? raw + "T12:00:00+08:00" : raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
function dateLabel(value) {
  const d = eventDay(value);
  return d ? dateFormat.format(d) : "Date to be announced";
}
function dateKey(d) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila",
  }).format(d);
}
function eventState(event) {
  const d = eventDay(event.date);
  return !d
    ? "undated"
    : dateKey(d) < dateKey(new Date())
      ? "past"
      : "upcoming";
}
const escapeXML = (s) =>
  String(s).replace(
    /[<>&"']/g,
    (ch) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[ch],
  );
// Original editorial poster art: generated per event, not a missing-image box.
function poster(event) {
  const colors = ["#54788c", "#627d91", "#6a8995", "#536e87"];
  const c = colors[(event.theme ?? 0) % 4];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="${c}"/><circle cx="1500" cy="230" r="128" fill="#e1f1f5" opacity=".7"/><path d="M0 790 420 360 680 620 1060 240 1560 710 1920 420V1080H0Z" fill="#b5cedb"/><path d="M0 840 400 570 860 860 1300 480 1920 830V1080H0Z" fill="#6c8ea2"/><path d="M0 910Q460 750 920 945T1920 840V1080H0Z" fill="#d6e7ef"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function cover(event) {
  const img = el("img", "event-cover");
  img.alt = `Cover artwork for ${event.title || "Community event"}`;
  img.width = 1920;
  img.height = 1080;
  img.loading = "lazy";
  const source = safeImage(
    eventCovers[event.eventId] ||
      event.coverImageUrl ||
      event.imageUrl ||
      event.coverImage ||
      event.image,
  );
  img.src = source || poster(event);
  if (source)
    img.addEventListener(
      "error",
      () => {
        img.src = poster(event);
      },
      { once: true },
    );
  return img;
}
const icons = {
  date: "M4 6h16v14H4zM8 3v6m8-6v6M4 10h16",
  location:
    "M12 22s7-7 7-13a7 7 0 1 0-14 0c0 6 7 13 7 13zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  time: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2",
};
function meta(kind, value) {
  const p = el("p", "event-meta");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", icons[kind]);
  svg.append(path);
  p.append(svg, document.createTextNode(value));
  return p;
}
function metadata(e) {
  return [
    meta("date", dateLabel(e.date)),
    meta("location", e.location || "Venue to be announced"),
    ...(typeof e.time === "string" && e.time.trim()
      ? [meta("time", e.time)]
      : []),
  ];
}
function showDetails(e) {
  const dialog = $("#eventDialog"),
    detail = $("#eventDetail");
  if (!dialog || !detail) return;
  const title = el("h2", "", e.title || "Community event");
  title.id = "eventDialogTitle";
  detail.replaceChildren(cover(e), title, ...metadata(e));
  if (e.description) detail.append(el("p", "", String(e.description)));
  dialog.showModal();
}
$("#eventDialog form button")?.addEventListener("click", (e) => {
  e.preventDefault();
  $("#eventDialog").close();
});
let events = [],
  activeFilter = "all",
  statusMessage = "";
const meetupGroup = "https://www.meetup.com/aws-sbg-at-colegio-de-muntinlupa/";
function eventMeetup(e) {
  for (const value of [
    e.meetupUrl,
    e.meetupLink,
    e.eventUrl,
    e.registrationUrl,
    e.link,
    e.url,
  ]) {
    try {
      const u = new URL(value);
      if (
        u.protocol === "https:" &&
        (u.hostname === "meetup.com" || u.hostname.endsWith(".meetup.com"))
      )
        return u.href;
    } catch {}
  }
  return null;
}
function eventCard(e) {
  const card = el("article", "event-card v19-event");
  const state = eventState(e);
  const badge = el(
    "span",
    "event-label",
    { upcoming: "Upcoming", past: "Past event", undated: "Date pending" }[
      state
    ],
  );
  badge.dataset.state = state;
  const art = el("div", "event-art");
  art.append(cover(e));
  const body = el("div", "event-body");
  const row = el("div", "event-meta-row");
  row.append(...metadata(e));
  body.append(el("h3", "", e.title || "Community event"), row);
  const target = eventMeetup(e);
  const link = el("a", "event-details-link");
  link.href = target || meetupGroup;
  link.textContent = "See details";
  link.setAttribute(
    "aria-label",
    `See details: ${e.title || "Community event"}${target ? " on Meetup" : " — Meetup community (event link unavailable)"}`,
  );
  if (!target)
    link.title = "Event link unavailable — opens our Meetup community";
  link.insertAdjacentHTML(
    "beforeend",
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  );
  body.append(link);
  art.append(badge);
  card.append(art, body);
  return card;
}
function shuffleEvents(items) {
  const shuffle = (a) => {
    a = [...a];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const past = shuffle(items.filter((e) => eventState(e) === "past")),
    up = shuffle(items.filter((e) => eventState(e) === "upcoming")),
    other = shuffle(items.filter((e) => eventState(e) === "undated"));
  let flip = Math.random() < 0.5;
  const out = [];
  while (past.length || up.length) {
    const first = flip ? past : up,
      second = flip ? up : past;
    out.push((first.length ? first : second).shift());
    flip = !flip;
  }
  return [...out, ...other];
}
// Duplicate a full measured group; matching group widths make the wrap seamless.
function renderMarquee(viewport, items) {
  viewport.replaceChildren();
  if (!items.length) return;
  const belt = el("div", "event-marquee-belt");
  // Fill at least one viewport before repeating. Identical group widths include the seam gap.
  const count = Math.max(
    items.length,
    Math.ceil(6 / items.length) * items.length,
  );
  for (let copy = 0; copy < 2; copy++) {
    const group = el(
      "div",
      "event-marquee-group" + (copy ? " marquee-clone" : ""),
    );
    if (copy) group.setAttribute("aria-hidden", "true");
    for (let i = 0; i < count; i++) {
      const card = eventCard(items[i % items.length]);
      card.querySelector("img").loading = "eager";
      if (copy || i >= items.length) {
        card.classList.add("marquee-repeat");
        card.setAttribute("aria-hidden", "true");
        card.querySelectorAll("a").forEach((a) => (a.tabIndex = -1));
      }
      group.append(card);
    }
    belt.append(group);
  }
  viewport.append(belt);
  belt.style.setProperty("--marquee-duration", `${count * 8}s`);
}
function renderEvents() {
  const list = $("#eventList"),
    status = $("#eventStatus");
  if (list && status) {
    const visible = events.filter(
      (e) => activeFilter === "all" || eventState(e) === activeFilter,
    );
    list.replaceChildren(...visible.map(eventCard));
    status.textContent = [
      statusMessage,
      visible.length
        ? `${visible.length} ${visible.length === 1 ? "event" : "events"} shown.`
        : "No matching events.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  const track = $("#homeEventList"),
    homeStatus = $("#homeEventStatus");
  if (track && homeStatus) {
    const mix = shuffleEvents(events);
    renderMarquee(track, mix);
    homeStatus.textContent = mix.length
      ? ""
      : statusMessage || "No events published yet.";
    track.hidden = !mix.length;
  }
}
async function loadEvents() {
  if (
    pages.events === false ||
    (!$("#eventList") && (!$("#homeEventList") || sections.events === false))
  )
    return;
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(8500) });
    if (!res.ok) throw Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.events)) throw Error("Unexpected events data");
    events = data.events.filter((e) => e && e.status === "published");
    events.sort((a, b) => {
      const ap = eventState(a) === "past",
        bp = eventState(b) === "past";
      if (ap !== bp) return ap ? 1 : -1;
      const ad = eventDay(a.date)?.getTime() ?? Infinity,
        bd = eventDay(b.date)?.getTime() ?? Infinity;
      return ap ? bd - ad : ad - bd;
    });
    if (!events.length) {
      statusMessage = "No published events yet.";
      events = [];
    }
  } catch {
    statusMessage = "Live events are temporarily unavailable.";
    events = [];
  }
  renderEvents();
}
document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    renderEvents();
  }),
);
// All public visibility is controlled here, never by query strings.
const routeKeys = {
  about: "about",
  events: "events",
  directors: "directors",
  people: "officers",
  officers: "officers",
  partners: "partners",
  contact: "contact",
};
const homeSections = {
  about: "about",
  mascots: "mascots",
  "event-highlights": "events",
  partners: "partners",
  join: "join",
};
const pageKey = routeKeys[document.body.dataset.page];
const disabledPage = pageKey && pages[pageKey] === false;
for (const link of document.querySelectorAll("a[href]")) {
  let url;
  try {
    url = new URL(link.href, location.href);
  } catch {
    continue;
  }
  if (url.origin !== location.origin) continue;
  const part = url.pathname.split("/").filter(Boolean)[0];
  const key = routeKeys[part];
  const section = !part && homeSections[url.hash.slice(1)];
  if (
    (key && pages[key] === false) ||
    (section && (sections[section] === false || pages[section] === false))
  )
    link.hidden = true;
}
if (document.body.dataset.page === "home")
  for (const [id, key] of Object.entries(homeSections)) {
    const section = document.getElementById(id);
    if (section && (sections[key] === false || pages[key] === false)) {
      section.hidden = true;
      section.setAttribute("data-manually-hidden", "");
    }
  }
if (disabledPage) {
  const main = $("#main-content") || $("main");
  if (main) {
    const box = el("section", "shell section route-section v25-unavailable");
    box.append(
      el("h1", "", "Coming soon"),
      el("p", "", "This page is not available at the moment."),
    );
    const back = el("a", "button", "Back to home");
    back.href = "/";
    box.append(back);
    main.replaceChildren(box);
  }
}
if (!disabledPage) {
  if (
    (pages.partners !== false && sections.partners !== false) ||
    pageKey === "partners"
  )
    renderPartners();
  renderOfficers();
  loadEvents();
}

function renderDirectors() {
  const roster = directors.filter(
    (o) =>
      o &&
      typeof o.name === "string" &&
      typeof o.position === "string" &&
      ["lead", "board", "associate"].includes(o.roleGroup),
  );
  const list = $("#directorList"),
    board = $("#boardList"),
    associate = $("#associateList");
  if (roster.length) reveal("directors", "directors");
  if (!list || !board || !associate) return;
  if (!roster.length)
    list.append(
      el("p", "v21-empty", "Leadership profiles will be published here."),
    );
  const displayRoster = roster;
  for (const person of displayRoster) {
    (person.roleGroup === "associate"
      ? associate
      : person.roleGroup === "board"
        ? board
        : list
    ).append(personCard(person));
  }
  if (!board.children.length)
    board.append(
      el(
        "p",
        "v21-empty",
        "The Board of Directors roster will be published here.",
      ),
    );
  if (!associate.children.length)
    associate.append(
      el("p", "v21-empty", "Associate Directors will be published here."),
    );
  const empty = $("#directorsUnavailable");
  if (empty) empty.hidden = !!roster.length;
}
if (!disabledPage) renderDirectors();
const memberAction = $("#membershipAction");
if (memberAction && membershipUrl) {
  try {
    const url = new URL(membershipUrl);
    if (url.protocol === "https:") {
      memberAction.href = url.href;
      $("#membershipNote").hidden = true;
    }
  } catch {}
}
const timeline = $("#orgTimeline");
if (timeline && organizationTimeline.length) {
  const nodes = organizationTimeline
    .filter((x) => x && x.date && x.title && x.description)
    .map((x) => {
      const a = el("article");
      a.append(
        el("span", "", x.date),
        el("h3", "", x.title),
        el("p", "", x.description),
      );
      return a;
    });
  if (nodes.length) timeline.replaceChildren(...nodes);
}
// Non-blocking scroll reveals: never hide content when reduced motion is enabled.
if (
  "IntersectionObserver" in window &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          observer.unobserve(e.target);
        }
      }),
    { threshold: 0.08 },
  );
  document
    .querySelectorAll(
      'body[data-page="home"] main > .section,body[data-page="home"] main > .partner-section',
    )
    .forEach((e) => {
      e.classList.add("reveal-on-scroll");
      observer.observe(e);
    });
}

// Per-character framing is editable in public-content.js, not baked into image files.
for (const [name, frame] of Object.entries(mascotFraming)) {
  const card = document.querySelector(`.mascot-card.${name}`);
  if (!card) continue;
  const number = (value, fallback, min, max) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  card.style.setProperty("--mascot-zoom", number(frame.zoom, 1, 0.5, 3));
  card.style.setProperty("--mascot-x", `${number(frame.x, 0, -60, 60)}%`);
  card.style.setProperty("--mascot-y", `${number(frame.y, 0, -60, 60)}%`);
}
// Touch users can reveal mascot information without needing hover.
document.querySelectorAll(".mascot-card").forEach((card) => {
  card.addEventListener("click", () => {
    if (matchMedia("(hover: none)").matches)
      card.classList.toggle("is-revealed");
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      card.classList.toggle("is-revealed");
    }
  });
});
document.querySelectorAll(".meetup-mark").forEach((img) => {
  const fallback = () => {
    img.hidden = true;
    img.nextElementSibling.hidden = false;
  };
  img.addEventListener("error", fallback, { once: true });
  if (img.complete && !img.naturalWidth) fallback();
});
