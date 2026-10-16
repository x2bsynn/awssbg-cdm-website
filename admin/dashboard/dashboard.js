import { userManager, signOut } from "../auth.js";

const API_BASE =
  "https://xxbmakdu4d.execute-api.us-east-1.amazonaws.com/prod/admin/events";

const $ = (id) => document.getElementById(id);
const notice = $("notice");
const formPanel = $("event-form-panel");
const management = $("event-management");
const eventsBody = $("events-body");

let idToken = null;
let events = [];

// Custom event date picker
const dateInput = $("date");
const dateTrigger = $("date-picker-trigger");
const dateDisplay = $("date-display");
const calendarPopup = $("calendar-popup");
const calendarMonth = $("calendar-month");
const calendarDays = $("calendar-days");

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderCalendar() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  calendarMonth.textContent = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  calendarDays.replaceChildren();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-empty";
    calendarDays.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const value = localDateString(date);
    const button = document.createElement("button");

    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;
    button.disabled = date < now;

    if (value === dateInput.value) {
      button.classList.add("selected");
    }

    if (value === localDateString(now)) {
      button.classList.add("today");
    }

    button.addEventListener("click", () => {
      dateInput.value = value;
      dateDisplay.textContent = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      calendarPopup.hidden = true;
      dateTrigger.setAttribute("aria-expanded", "false");
      renderCalendar();
    });

    calendarDays.appendChild(button);
  }

  $("calendar-prev").disabled =
    year === now.getFullYear() && month === now.getMonth();
}

let visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

dateTrigger.addEventListener("click", () => {
  const opening = calendarPopup.hidden;
  calendarPopup.hidden = !opening;
  dateTrigger.setAttribute("aria-expanded", String(opening));

  if (opening) renderCalendar();
});

$("calendar-prev").addEventListener("click", () => {
  visibleMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() - 1,
    1,
  );
  renderCalendar();
});

$("calendar-next").addEventListener("click", () => {
  visibleMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    1,
  );
  renderCalendar();
});

renderCalendar();

const timeTrigger = $("time-picker-trigger");
const timePopup = $("time-popup");
const timeInput = $("time");
const timeDisplay = $("time-display");

const startTimeInput = $("start-time");
const endTimeInput = $("end-time");
const durationValue = $("time-duration-value");
const timeError = $("time-error");

let savedStartTime = "";
let savedEndTime = "";

function formatTime(value) {
  if (!value) return "";

  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
}

function parseTimeRange(value) {
  const match = value.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );

  if (!match) return ["", ""];

  function to24Hour(hour, minute, period) {
    let h = Number(hour) % 12;
    if (period.toUpperCase() === "PM") h += 12;
    return `${String(h).padStart(2, "0")}:${minute}`;
  }

  return [
    to24Hour(match[1], match[2], match[3]),
    to24Hour(match[4], match[5], match[6]),
  ];
}

function updateDuration() {
  const start = startTimeInput.value;
  const end = endTimeInput.value;

  timeError.hidden = true;

  if (!start || !end) {
    durationValue.textContent = "Select your start and end times";
    return;
  }

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (endMinutes <= startMinutes) {
    durationValue.textContent = "Check the selected times";
    return;
  }

  const duration = endMinutes - startMinutes;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  const parts = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);

  durationValue.textContent = parts.join(" ");
}

function closeTimePicker() {
  timePopup.hidden = true;
  timeTrigger.setAttribute("aria-expanded", "false");
}

function openTimePicker() {
  // Preserve the last applied selection when reopening the picker.
  startTimeInput.value = savedStartTime;
  endTimeInput.value = savedEndTime;
  timeError.hidden = true;
  updateDuration();

  timePopup.hidden = false;
  timeTrigger.setAttribute("aria-expanded", "true");

  calendarPopup.hidden = true;
  dateTrigger.setAttribute("aria-expanded", "false");
}

timeTrigger.addEventListener("click", () => {
  if (timePopup.hidden) {
    openTimePicker();
  } else {
    closeTimePicker();
  }
});

startTimeInput.addEventListener("input", updateDuration);
endTimeInput.addEventListener("input", updateDuration);

$("time-apply").addEventListener("click", () => {
  const start = startTimeInput.value;
  const end = endTimeInput.value;

  if (!start || !end) {
    timeError.textContent = "Please select both a start and end time.";
    timeError.hidden = false;
    return;
  }

  if (end <= start) {
    timeError.textContent = "The end time must be later than the start time.";
    timeError.hidden = false;
    return;
  }

  savedStartTime = start;
  savedEndTime = end;

  const range = `${formatTime(start)} – ${formatTime(end)}`;

  timeInput.value = range;
  timeDisplay.textContent = range;

  closeTimePicker();
});

$("time-clear").addEventListener("click", () => {
  savedStartTime = "";
  savedEndTime = "";
  startTimeInput.value = "";
  endTimeInput.value = "";
  timeInput.value = "";
  timeDisplay.textContent = "Set event time range";
  durationValue.textContent = "Select your start and end times";
  timeError.hidden = true;

  closeTimePicker();
});

$("time-cancel").addEventListener("click", closeTimePicker);

function showNotice(message, type = "") {
  notice.textContent = message;
  notice.className = `notice ${type}`;
}

function setProfile(user) {
  const profile = user.profile ?? {};
  const email = profile.email ?? user.email ?? "Signed-in account";
  const fullName =
    profile.name ||
    [profile.given_name, profile.family_name].filter(Boolean).join(" ") ||
    email;

  const initials = fullName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  $("profile-name").textContent = fullName;
  $("profile-email").textContent = email;
  $("profile-avatar").textContent = initials || "A";
  $("welcome-name").textContent = fullName.split(/\s+/)[0];
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: idToken,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (response.status === 401) {
    throw new Error("Your session is no longer authorized. Sign in again.");
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }

  return data;
}

function resetForm() {
  $("event-form").reset();
  $("event-id").value = "";
  $("form-heading").textContent = "Create event";
  $("save-draft-button").textContent = "Save as Draft";
  $("publish-button").textContent = "Publish Event";
  dateDisplay.textContent = "Choose a date";
  timeDisplay.textContent = "Set event time range";
  savedStartTime = "";
  savedEndTime = "";
  startTimeInput.value = "";
  endTimeInput.value = "";
  timeError.hidden = true;
  durationValue.textContent = "Select your start and end times";

  timePopup.hidden = true;
  timeTrigger.setAttribute("aria-expanded", "false");
  calendarPopup.hidden = true;
  dateTrigger.setAttribute("aria-expanded", "false");

  visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  renderCalendar();

  formPanel.hidden = true;
}

function openCreateForm() {
  resetForm();
  formPanel.hidden = false;
  $("title").focus();
  formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  $("total-events").textContent = events.length;
  $("published-events").textContent = events.filter(
    (event) => event.status === "published",
  ).length;
  $("draft-events").textContent = events.filter(
    (event) => event.status === "draft",
  ).length;
  $("upcoming-events").textContent = events.filter(
    (event) => event.status === "published" && event.date >= todayString,
  ).length;
}

function renderEvents() {
  eventsBody.replaceChildren();

  const query = $("event-search").value.trim().toLowerCase();
  const filtered = events.filter((event) =>
    [event.title, event.date, event.location, event.status].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(query),
    ),
  );

  $("result-count").textContent =
    `${filtered.length} ${filtered.length === 1 ? "event" : "events"}`;

  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-cell";
    cell.textContent = events.length
      ? "No events match your search."
      : "No events yet. Create your first event to get started.";
    row.append(cell);
    eventsBody.append(row);
    return;
  }

  for (const event of filtered) {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = event.title ?? "Untitled event";

    const eventId = document.createElement("div");
    eventId.className = "event-id";
    eventId.textContent = event.eventId ? `ID: ${event.eventId}` : "";

    titleCell.append(title, eventId);
    row.append(titleCell);

    for (const value of [event.date, event.location]) {
      const cell = document.createElement("td");
      cell.textContent = value ?? "—";
      row.append(cell);
    }

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    const status = String(event.status ?? "draft").toLowerCase();
    badge.className = `status-badge ${status}`;
    badge.textContent = status;
    statusCell.append(badge);
    row.append(statusCell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "event-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => {
      $("event-id").value = event.eventId;
      $("title").value = event.title ?? "";
      $("date").value = event.date ?? "";
      dateDisplay.textContent = event.date
        ? new Date(`${event.date}T12:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Choose a date";
      renderCalendar();
      $("location").value = event.location ?? "";
      $("save-draft-button").textContent = "Save as Draft";
      $("publish-button").textContent =
        event.status === "published" ? "Update & Publish" : "Publish Event";
      timeInput.value = event.time ?? "";
      timeDisplay.textContent = event.time || "Set event time range";

      [savedStartTime, savedEndTime] = parseTimeRange(event.time ?? "");

      startTimeInput.value = savedStartTime;
      endTimeInput.value = savedEndTime;
      updateDuration();
      $("form-heading").textContent = "Edit event";
      formPanel.hidden = false;
      $("title").focus();
      formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;

      try {
        await apiRequest(`${API_BASE}/${encodeURIComponent(event.eventId)}`, {
          method: "DELETE",
        });
        showNotice("Event deleted successfully.", "success");
        await loadEvents();
      } catch (error) {
        showNotice(error.message, "error");
      }
    });

    actions.append(edit, remove);
    actionsCell.append(actions);
    row.append(actionsCell);
    eventsBody.append(row);
  }
}

async function loadEvents() {
  eventsBody.replaceChildren();
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.className = "empty-cell";
  cell.textContent = "Loading events...";
  row.append(cell);
  eventsBody.append(row);

  try {
    const data = await apiRequest(API_BASE);
    events = Array.isArray(data) ? data : (data?.events ?? []);
    updateStats();
    renderEvents();
  } catch (error) {
    eventsBody.replaceChildren();
    const errorRow = document.createElement("tr");
    const errorCell = document.createElement("td");
    errorCell.colSpan = 5;
    errorCell.className = "empty-cell";
    errorCell.textContent = error.message;
    errorRow.append(errorCell);
    eventsBody.append(errorRow);
    $("result-count").textContent = "Unable to load events";
    showNotice(error.message, "error");
  }
}

$("new-event-button").addEventListener("click", openCreateForm);
$("panel-new-event").addEventListener("click", openCreateForm);

function showWorkspace(view) {
  const isOfficers = view === "officers";

  $("event-management").hidden = isOfficers;
  $("officers-management").hidden = !isOfficers;
  $("new-event-button").hidden = isOfficers;

  document.querySelectorAll(".nav-list .nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  $(isOfficers ? "officers-nav" : "events-nav").classList.add("active");

  const breadcrumb = document.querySelector(".breadcrumb");
  breadcrumb.replaceChildren("Workspace / ");

  const currentPage = document.createElement("strong");
  currentPage.textContent = isOfficers ? "Officers" : "Events";
  breadcrumb.appendChild(currentPage);

  if (isOfficers) {
    $("new-officer-button").focus();
  }
}

$("events-nav").addEventListener("click", () => showWorkspace("events"));
$("officers-nav").addEventListener("click", () => showWorkspace("officers"));

const officerRecords = [
  {
    id: "person-1",
    name: "Alexandra Reyes",
    photo: "",
    positions: [
      {
        title: "Student Builder Group Lead",
        office: "Executive",
        year: "2026-2027",
      },
      {
        title: "Executive Director",
        office: "Executive",
        year: "2026-2027",
      },
    ],
    birthdate: "2003-05-14",
    contactNumber: "",
    program: "BS Computer Engineering",
    cdmEmail: "alexandra.reyes@cdm.edu.ph",
    personalEmail: "",
    email: "alexandra.reyes@cdm.edu.ph",
    status: "published",
    term: "2026-2027",
    reportsTo: [],
  },
  {
    id: "person-2",
    name: "Miguel Santos",
    photo: "",
    positions: [
      {
        title: "Deputy Director",
        office: "Executive",
        year: "2026-2027",
      },
    ],
    birthdate: "2004-02-21",
    contactNumber: "",
    program: "BS Computer Engineering",
    cdmEmail: "miguel.santos@cdm.edu.ph",
    personalEmail: "",
    email: "miguel.santos@cdm.edu.ph",
    status: "published",
    term: "2026-2027",
    reportsTo: ["person-1"],
  },
  {
    id: "person-3",
    name: "Sofia Mendoza",
    photo: "",
    positions: [
      {
        title: "Executive Secretary",
        office: "Executive",
        year: "2026-2027",
      },
    ],
    birthdate: "2003-11-09",
    contactNumber: "",
    program: "BS Information Technology",
    cdmEmail: "sofia.mendoza@cdm.edu.ph",
    personalEmail: "",
    email: "sofia.mendoza@cdm.edu.ph",
    status: "published",
    term: "2026-2027",
    reportsTo: ["person-1"],
  },
  {
    id: "person-4",
    name: "Daniel Cruz",
    photo: "",
    positions: [
      {
        title: "Director",
        office: "Executive",
        year: "2026-2027",
      },
      {
        title: "Director",
        office: "Creatives",
        year: "2026-2027",
      },
    ],
    birthdate: "2004-07-18",
    contactNumber: "",
    program: "BS Computer Engineering",
    cdmEmail: "daniel.cruz@cdm.edu.ph",
    personalEmail: "",
    email: "daniel.cruz@cdm.edu.ph",
    status: "published",
    term: "2026-2027",
    reportsTo: ["person-1"],
  },
  {
    id: "person-5",
    name: "Isabella Flores",
    photo: "",
    positions: [
      {
        title: "Director",
        office: "Executive",
        year: "2026-2027",
      },
      {
        title: "Director",
        office: "Technology",
        year: "2026-2027",
      },
    ],
    birthdate: "2003-09-02",
    contactNumber: "",
    program: "BS Computer Engineering",
    cdmEmail: "isabella.flores@cdm.edu.ph",
    personalEmail: "",
    email: "isabella.flores@cdm.edu.ph",
    status: "published",
    term: "2026-2027",
    reportsTo: ["person-1"],
  },
  {
    id: "person-6",
    name: "Gabriel Torres",
    photo: "",
    positions: [
      {
        title: "Director",
        office: "Executive",
        year: "2026-2027",
      },
      {
        title: "Director",
        office: "Finance",
        year: "2026-2027",
      },
    ],
    birthdate: "2004-01-26",
    contactNumber: "",
    program: "BS Business Administration",
    cdmEmail: "gabriel.torres@cdm.edu.ph",
    personalEmail: "",
    email: "gabriel.torres@cdm.edu.ph",
    status: "draft",
    term: "2026-2027",
    reportsTo: ["person-1"],
  },
  {
    id: "person-7",
    name: "Chloe Navarro",
    photo: "",
    positions: [
      {
        title: "Director",
        office: "Executive",
        year: "2026-2027",
      },
      {
        title: "Director",
        office: "Relations",
        year: "2026-2027",
      },
    ],
    birthdate: "2003-12-12",
    contactNumber: "",
    program: "BS Information Technology",
    cdmEmail: "chloe.navarro@cdm.edu.ph",
    personalEmail: "",
    email: "chloe.navarro@cdm.edu.ph",
    status: "published",
    term: "2026-2027",
    reportsTo: ["person-1"],
  },
  {
    id: "person-8",
    name: "Ethan Garcia",
    photo: "",
    positions: [
      {
        title: "Director",
        office: "Executive",
        year: "2026-2027",
      },
      {
        title: "Director",
        office: "Marketing",
        year: "2026-2027",
      },
    ],
    birthdate: "2004-04-30",
    contactNumber: "",
    program: "BS Computer Engineering",
    cdmEmail: "ethan.garcia@cdm.edu.ph",
    personalEmail: "",
    email: "ethan.garcia@cdm.edu.ph",
    status: "published",
    term: "2026-2027",
    reportsTo: ["person-1"],
  },
  {
    id: "person-9",
    name: "Amara Villanueva",
    photo: "",
    positions: [
      {
        title: "Director",
        office: "Executive",
        year: "2026-2027",
      },
      {
        title: "Director",
        office: "Operations",
        year: "2026-2027",
      },
    ],
    birthdate: "2003-08-07",
    contactNumber: "",
    program: "BS Computer Engineering",
    cdmEmail: "amara.villanueva@cdm.edu.ph",
    personalEmail: "",
    email: "amara.villanueva@cdm.edu.ph",
    status: "draft",
    term: "2026-2027",
    reportsTo: ["person-1"],
  },
  {
    id: "person-10",
    name: "Patricia Lim",
    photo: "",
    positions: [
      {
        title: "Organization Adviser",
        office: "Advisory",
        year: "2026-2027",
      },
    ],
    birthdate: "",
    contactNumber: "",
    program: "",
    cdmEmail: "",
    personalEmail: "",
    email: "",
    status: "published",
    term: "2026-2027",
    reportsTo: [],
  },
];

function getOfficerPositions(officer) {
  return Array.isArray(officer.positions) ? officer.positions : [];
}

function getOfficerFilter(filterName) {
  return (
    $(`officer-${filterName}-trigger`)?.closest(".officer-select")?.dataset
      .value || "all"
  );
}

function getOfficerOfficeText(officer) {
  return [
    ...new Set(getOfficerPositions(officer).map((position) => position.office)),
  ].join(", ");
}

function getOfficerPositionText(officer) {
  return [
    ...new Set(getOfficerPositions(officer).map((position) => position.title)),
  ].join(", ");
}

function updateOfficerStats() {
  $("officer-total").textContent = officerRecords.length;

  $("officer-offices").textContent = new Set(
    officerRecords.flatMap((officer) =>
      getOfficerPositions(officer).map((position) => position.office),
    ),
  ).size;

  $("officer-published").textContent = officerRecords.filter(
    (officer) => officer.status === "published",
  ).length;

  $("officer-drafts").textContent = officerRecords.filter(
    (officer) => officer.status === "draft",
  ).length;
}

function updateOfficerYearOptions() {
  const dropdown = document.querySelector(
    '.officer-select[data-filter="year"]',
  );

  if (!dropdown) return;

  const menu = dropdown.querySelector(".officer-select-menu");
  const trigger = dropdown.querySelector(".officer-select-trigger");
  const currentValue = dropdown.dataset.value || "all";

  const years = [
    ...new Set(
      officerRecords
        .flatMap((officer) =>
          getOfficerPositions(officer).map((position) => position.year),
        )
        .filter(Boolean),
    ),
  ]
    .sort()
    .reverse();

  const options = [
    { value: "all", label: "All academic years" },
    ...years.map((year) => ({ value: year, label: year })),
  ];

  menu.replaceChildren();

  options.forEach(({ value, label }) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "officer-select-option";
    option.dataset.value = value;
    option.setAttribute("role", "option");

    const selected = value === currentValue;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-selected", String(selected));

    const text = document.createElement("span");
    text.textContent = label;

    const check = document.createElement("span");
    check.className = "option-check";
    check.textContent = "✓";

    option.append(text, check);
    menu.appendChild(option);
  });

  const selectedOption =
    options.find((option) => option.value === currentValue) || options[0];

  dropdown.dataset.value = selectedOption.value;
  dropdown.querySelector(".officer-select-label").textContent =
    selectedOption.label;

  trigger.setAttribute("aria-expanded", "false");
}

function renderOfficerTree() {
  const tree = $("officer-tree");
  if (!tree) return;

  const published = officerRecords.filter(
    (officer) => officer.status === "published",
  );

  const positions = (officer) =>
    Array.isArray(officer.positions) ? officer.positions : [];

  const hasRole = (officer, title) =>
    positions(officer).some((p) => p.title === title);

  const hasOffice = (officer, office) =>
    positions(officer).some((p) => p.office === office);

  const roleNames = (officer, office) => {
    const roles = positions(officer)
      .filter((p) => p.office === office)
      .map((p) => p.title);

    return [...new Set(roles)].join(" · ");
  };

  const escapeHTML = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  const personCard = (officer, subtitle = "") => `
    <article class="org-person">
      <div class="org-person-accent"></div>
      <div class="org-person-info">
        <strong>${escapeHTML(officer.name)}</strong>
        <span>${escapeHTML(subtitle || roleNames(officer, "Executive") || "Organization member")}</span>
      </div>
    </article>
  `;

  const empty = `<p class="org-empty">No published officers assigned.</p>`;

  const leaders = published.filter(
    (o) =>
      hasRole(o, "Student Builder Group Lead") ||
      hasRole(o, "Executive Director"),
  );

  const sbgl = leaders.filter((o) => hasRole(o, "Student Builder Group Lead"));

  const executiveDirectors = leaders.filter((o) =>
    hasRole(o, "Executive Director"),
  );

  const advisers = published.filter((o) => hasOffice(o, "Advisory"));

  const executiveTeam = published.filter(
    (o) =>
      hasOffice(o, "Executive") &&
      !hasRole(o, "Student Builder Group Lead") &&
      !hasRole(o, "Executive Director"),
  );

  const offices = [
    "Creatives",
    "Finance",
    "Technology",
    "Relations",
    "Marketing",
    "Operations",
  ];

  const officeMarkup = offices
    .map((office) => {
      const members = published.filter((o) => hasOffice(o, office));

      return `
      <section class="org-branch">
        <div class="org-office-heading">${escapeHTML(office)}</div>
        <div class="org-branch-people">
          ${
            members.length
              ? members.map((o) => personCard(o, roleNames(o, office))).join("")
              : empty
          }
        </div>
      </section>
    `;
    })
    .join("");

  tree.innerHTML = `
    <div class="org-chart">
      <div class="org-chart-heading">
        <div>
          <span class="org-eyebrow">AWSSBG · CDM</span>
          <h3>Organization Structure</h3>
          <p>Leadership, executive coordination, and functional offices</p>
        </div>
        <span class="org-live-label">
          <span></span> Published profiles
        </span>
      </div>

<div class="org-leadership">
  <div class="org-leader-card org-leader-primary">
    <span class="org-role-tag">STUDENT BUILDER GROUP LEAD</span>
    ${
      sbgl.length
        ? sbgl
            .map(
              (o) => `
          <div class="org-leader-name">${escapeHTML(o.name)}</div>
        `,
            )
            .join("")
        : `<div class="org-leader-name">Position vacant</div>`
    }
  </div>

  <div class="org-leader-card org-leader-executive">
    <span class="org-role-tag">EXECUTIVE DIRECTOR</span>
    ${
      executiveDirectors.length
        ? executiveDirectors
            .map(
              (o) => `
          <div class="org-leader-name">${escapeHTML(o.name)}</div>
        `,
            )
            .join("")
        : `<div class="org-leader-name">Position vacant</div>`
    }
  </div>

  <aside class="org-adviser">
    <span class="org-adviser-symbol">✳</span>
    <div class="org-adviser-info">
      <span class="org-role-tag">ADVISORY</span>
      <strong>Organization Adviser</strong>
      ${
        advisers.length
          ? advisers
              .map(
                (o) => `
            <div class="org-adviser-name">${escapeHTML(o.name)}</div>
          `,
              )
              .join("")
          : `<div class="org-adviser-name">No published adviser</div>`
      }
    </div>
  </aside>
</div>

      <div class="org-connector" aria-hidden="true">
        <span></span>
      </div>

      <section class="org-tier">
        <div class="org-tier-label">EXECUTIVE OFFICE</div>
        <div class="org-executive-grid">
          ${
            executiveTeam.length
              ? executiveTeam.map((o) => personCard(o)).join("")
              : empty
          }
        </div>
      </section>

      <div class="org-connector org-connector-long" aria-hidden="true">
        <span></span>
      </div>

      <section class="org-functional">
        <div class="org-tier-label">FUNCTIONAL OFFICES</div>
        <div class="org-functional-grid">
          ${officeMarkup}
        </div>
      </section>

      <div class="org-chart-footer">
        <span>AWSSBG-CDM</span>
        <span>Showing published profiles only</span>
      </div>
    </div>
  `;
}

function renderOfficers() {
  const list = $("officer-list");
  const search = $("officer-search").value.trim().toLowerCase();
  const statusFilter = getOfficerFilter("status");
  const yearFilter = getOfficerFilter("year");

  const filtered = officerRecords.filter((officer) => {
    const positions = getOfficerPositions(officer);
    const name = officer.name.toLowerCase();
    const officeText = getOfficerOfficeText(officer);
    const positionText = getOfficerPositionText(officer);
    const yearText = officer.term || "";

    const matchesSearch = [name, officeText, positionText, yearText].some(
      (value) => value.toLowerCase().includes(search),
    );

    const matchesStatus =
      statusFilter === "all" || officer.status === statusFilter;

    const matchesYear =
      yearFilter === "all" ||
      positions.some((position) => position.year === yearFilter) ||
      yearText === yearFilter;

    return matchesSearch && matchesStatus && matchesYear;
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="officer-empty">
        No officers match your search or filters.
      </div>
    `;
    renderOfficerTree();
    return;
  }

  const escapeHTML = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  list.innerHTML = `
    <div class="table-wrap officer-table-wrap">
      <table class="officer-table">
        <thead>
          <tr>
            <th scope="col">Officer Name*</th>
            <th scope="col">Office</th>
            <th scope="col">Position</th>
            <th scope="col">Academic year</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((officer) => {
              const positions = getOfficerPositions(officer);

              const offices = [
                ...new Set(positions.map((position) => position.office)),
              ];

              const titles = [
                ...new Set(positions.map((position) => position.title)),
              ];

              const years = [
                ...new Set(
                  positions.map((position) => position.year).filter(Boolean),
                ),
              ];

              return `
              <tr>
                <td>
                  <span class="officer-name-cell">
                    ${escapeHTML(officer.name)}
                  </span>
                </td>
                <td>${escapeHTML(offices.join(", ") || "—")}</td>
                <td>${escapeHTML(titles.join(", ") || "—")}</td>
                <td>${escapeHTML(years.join(", ") || officer.term || "—")}</td>
                <td>
                  <span class="status-badge ${
                    officer.status === "published"
                      ? "status-published"
                      : "status-draft"
                  }">
                    ${officer.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td>
                  <div class="officer-row-actions">
                    <button
                      class="button button-light officer-edit-button"
                      type="button"
                      data-officer-id="${escapeHTML(officer.id)}"
                    >Edit</button>
                    <button
                      class="button button-light officer-delete-button"
                      type="button"
                      data-officer-id="${escapeHTML(officer.id)}"
                    >Delete</button>
                  </div>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  renderOfficerTree();
}

/* ========================================
   CUSTOM OFFICER FILTER DROPDOWNS
======================================== */

function setupOfficerDropdown(dropdown) {
  const trigger = dropdown.querySelector(".officer-select-trigger");
  const label = dropdown.querySelector(".officer-select-label");
  const menu = dropdown.querySelector(".officer-select-menu");
  const options = () => [
    ...dropdown.querySelectorAll(".officer-select-option"),
  ];

  if (!trigger || !label || !menu) return;

  function closeDropdown() {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function selectOption(option) {
    options().forEach((item) => {
      const selected = item === option;

      item.classList.toggle("selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });

    label.textContent = option.querySelector("span").textContent;
    dropdown.dataset.value = option.dataset.value;

    closeDropdown();

    // Update the officer list when the filtering logic is added.
    if (typeof renderOfficers === "function") {
      renderOfficers();
    }
  }

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();

    const opening = menu.hidden;

    // Close other custom dropdowns first.
    document.querySelectorAll(".officer-select-menu").forEach((otherMenu) => {
      otherMenu.hidden = true;
    });

    document
      .querySelectorAll(".officer-select-trigger")
      .forEach((otherTrigger) => {
        otherTrigger.setAttribute("aria-expanded", "false");
      });

    menu.hidden = !opening;
    trigger.setAttribute("aria-expanded", String(opening));
  });

  menu.addEventListener("click", (event) => {
    const option = event.target.closest(".officer-select-option");
    if (!option) return;

    selectOption(option);
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdown();
      trigger.focus();
    }

    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      options()[0]?.focus();
    }
  });

  menu.addEventListener("keydown", (event) => {
    const items = options();
    const currentIndex = items.indexOf(document.activeElement);

    if (event.key === "Escape") {
      closeDropdown();
      trigger.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = document.activeElement.closest(".officer-select-option");
      if (option) selectOption(option);
    }
  });
}

document.querySelectorAll(".officer-select").forEach(setupOfficerDropdown);

document.addEventListener("click", (event) => {
  if (!event.target.closest(".officer-select")) {
    document.querySelectorAll(".officer-select-menu").forEach((menu) => {
      menu.hidden = true;
    });

    document.querySelectorAll(".officer-select-trigger").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
  }
});

$("officer-search").addEventListener("input", renderOfficers);

updateOfficerYearOptions();
updateOfficerStats();
renderOfficers();

$("cancel-button").addEventListener("click", resetForm);
$("refresh-button").addEventListener("click", loadEvents);
$("profile-refresh").addEventListener("click", async () => {
  $("profile-menu").hidden = true;
  $("profile-button").setAttribute("aria-expanded", "false");
  await loadEvents();
});

$("event-search").addEventListener("input", renderEvents);

$("profile-button").addEventListener("click", () => {
  const menu = $("profile-menu");
  menu.hidden = !menu.hidden;
  $("profile-button").setAttribute("aria-expanded", String(!menu.hidden));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".profile-wrap")) {
    $("profile-menu").hidden = true;
    $("profile-button").setAttribute("aria-expanded", "false");
  }
});

$("event-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateOptionalTimeRange()) {
    return;
  }
  // Prevent native validation from trying to focus controls
  // inside the hidden custom time picker.
  if (!$("event-form").checkValidity()) {
    $("event-form").reportValidity();
    return;
  }

  const eventId = $("event-id").value;

  // Determine which submit button was clicked.
  const action = event.submitter?.value;

  if (action !== "draft" && action !== "published") {
    showNotice("Please choose Save as Draft or Publish Event.", "error");
    return;
  }

  const payload = {
    title: $("title").value.trim(),
    date: $("date").value,
    time: $("time").value,
    location: $("location").value.trim(),
    status: action,
  };

  // Validate required fields before saving.
  if (!payload.title || !payload.date || !payload.location) {
    showNotice("Please complete the event title, date, and location.", "error");
    return;
  }

  const draftButton = $("save-draft-button");
  const publishButton = $("publish-button");

  draftButton.disabled = true;
  publishButton.disabled = true;

  try {
    if (eventId) {
      await apiRequest(`${API_BASE}/${encodeURIComponent(eventId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      showNotice(
        action === "published"
          ? "Event updated and published successfully."
          : "Event saved as a draft successfully.",
        "success",
      );
    } else {
      await apiRequest(API_BASE, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showNotice(
        action === "published"
          ? "Event published successfully."
          : "Event saved as a draft successfully.",
        "success",
      );
    }

    resetForm();
    await loadEvents();
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    draftButton.disabled = false;
    publishButton.disabled = false;
  }
});

$("logout-button").addEventListener("click", async () => {
  try {
    await signOut();
  } catch (error) {
    showNotice(error.message, "error");
  }
});

function validateOptionalTimeRange() {
  const startTime = document.getElementById("start-time").value;
  const endTime = document.getElementById("end-time").value;
  const timeError = document.getElementById("time-error");

  timeError.hidden = true;
  timeError.textContent = "";

  // Both times are optional when neither is supplied.
  if (!startTime && !endTime) {
    return true;
  }

  if (!startTime || !endTime) {
    timeError.textContent =
      "Choose both a start time and an end time, or leave both blank.";
    timeError.hidden = false;
    return false;
  }

  if (startTime >= endTime) {
    timeError.textContent = "The end time must be later than the start time.";
    timeError.hidden = false;
    return false;
  }

  return true;
}

try {
  const user = await userManager.getUser();

  if (!user || user.expired || !user.id_token) {
    await userManager.signinRedirect();
  } else {
    idToken = user.id_token;
    setProfile(user);
    management.hidden = false;
    showNotice("Signed in successfully. Loading your events...", "success");
    await loadEvents();
  }
} catch (error) {
  console.error(error);
  showNotice("Unable to verify your session. Please sign in again.", "error");
}
