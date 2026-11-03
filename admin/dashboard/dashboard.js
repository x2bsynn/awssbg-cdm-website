import { fetchAuthSession, getCurrentUser, signOut } from "../amplify.js";

const API_BASE =
  "https://xxbmakdu4d.execute-api.us-east-1.amazonaws.com/prod/admin/events";

const OFFICERS_API_BASE =
  "https://xxbmakdu4d.execute-api.us-east-1.amazonaws.com/prod/admin/officers";

const $ = (id) => document.getElementById(id);
let notice = $("notice");
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
  if (!notice || !notice.isConnected) {
    notice = document.createElement("div");
    notice.id = "notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");

    document.body.prepend(notice);
  }

  notice.textContent = String(message ?? "");
  notice.className = `notice ${type}`.trim();
}

function setProfile(user) {
  const profile = user.profile ?? {};

  const email = profile.email ?? user.email ?? "";

  // Prefer the person's actual name, then their chosen username.
  // Never use the Cognito sub UUID as the display name.
  const fullName =
    profile.name ||
    profile.preferred_username ||
    profile["cognito:username"] ||
    profile.username ||
    "Administrator";

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
// $("panel-new-event").addEventListener("click", openCreateForm);

async function loadOfficers() {
  try {
    const data = await apiRequest(OFFICERS_API_BASE);
    const items = Array.isArray(data?.items) ? data.items : [];

    officerRecords = items.map((officer) => ({
      ...officer,
      id: officer.officerId ?? officer.id,
      name: officer.name ?? "",
      positions: Array.isArray(officer.positions) ? officer.positions : [],
      status: officer.status ?? "draft",
      studentNumber: officer.studentNumber ?? "",
      yearLevel: officer.yearLevel ?? "",
      // Older records stored this as "term"; it is now "academicYear".
      academicYear: officer.academicYear ?? officer.term ?? "",
    }));

    updateOfficerYearOptions();
    updateOfficerStats();
    renderOfficers();

    console.log("Officers loaded:", officerRecords.length);
  } catch (error) {
    console.error("Unable to load officers:", error);
    showNotice(error.message || "Unable to load officers.", "error");
  }
}

async function showWorkspace(view) {
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
    await loadOfficers();
  }
}

$("events-nav").addEventListener("click", () => showWorkspace("events"));
$("officers-nav").addEventListener("click", () => showWorkspace("officers"));

let officerRecords = [];

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

  // Match Adviser, Advisor, Org Adviser, and Organization Adviser,
  // regardless of capitalization or repeated spaces.
  const isOrgAdviser = (officer) =>
    positions(officer).some((position) =>
      /^(?:adviser|advisor|org\s+adviser|org\s+advisor|organization\s+adviser|organization\s+advisor)$/i.test(
        String(position.title ?? "").trim(),
      ),
    );

  const hasRole = (officer, title) =>
    positions(officer).some(
      (position) =>
        String(position.title ?? "")
          .trim()
          .toLowerCase() === title.toLowerCase(),
    );

  const hasOffice = (officer, office) =>
    positions(officer).some(
      (position) =>
        String(position.office ?? "")
          .trim()
          .toLowerCase() === office.toLowerCase(),
    );

  const roleNames = (officer, office) => {
    const roles = positions(officer)
      .filter(
        (position) =>
          String(position.office ?? "")
            .trim()
            .toLowerCase() === office.toLowerCase(),
      )
      .map((position) => position.title)
      .filter(Boolean);

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
        <span>${escapeHTML(
          subtitle || roleNames(officer, "Executive") || "Organization member",
        )}</span>
      </div>
    </article>
  `;

  const empty = `<p class="org-empty">No published officers assigned.</p>`;

  // Top-level leadership.
  const advisers = published.filter(isOrgAdviser);

  const sbgl = published.filter((officer) =>
    hasRole(officer, "Student Builder Group Lead"),
  );

  const executiveDirectors = published.filter((officer) =>
    hasRole(officer, "Executive Director"),
  );

  // Exclude all three leadership roles from the Executive Office.
  // The Org Adviser must not appear twice, even if their office is Executive.
  const executiveTeam = published.filter(
    (officer) =>
      hasOffice(officer, "Executive") &&
      !isOrgAdviser(officer) &&
      !hasRole(officer, "Student Builder Group Lead") &&
      !hasRole(officer, "Executive Director"),
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
      // Avoid duplicating the adviser in a functional office.
      const members = published.filter(
        (officer) => hasOffice(officer, office) && !isOrgAdviser(officer),
      );

      return `
        <section class="org-branch">
          <div class="org-office-heading">${escapeHTML(office)}</div>
          <div class="org-branch-people">
            ${
              members.length
                ? members
                    .map((officer) =>
                      personCard(officer, roleNames(officer, office)),
                    )
                    .join("")
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
          <span class="org-eyebrow">AWS Student Builder Group - Colegio de Muntinlupa</span>
          <h3>Organization Structure</h3>
          <p>Leadership, executive coordination, and functional offices</p>
        </div>
        <span class="org-live-label">
          <span></span> Published profiles
        </span>
      </div>

      <!-- TOP ROW: Org Adviser, SBGL, and Executive Director -->
      <div class="org-leadership org-leadership-three">

        <div class="org-leader-card org-leader-adviser">
          <span class="org-role-tag">ORGANIZATIONAL ADVISER</span>
          ${
            advisers.length
              ? advisers
                  .map(
                    (officer) => `
                      <div class="org-leader-name">
                        ${escapeHTML(officer.name)}
                      </div>
                    `,
                  )
                  .join("")
              : `<div class="org-leader-name">Position vacant</div>`
          }
        </div>

        <div class="org-leader-card org-leader-primary">
          <span class="org-role-tag">STUDENT BUILDER GROUP LEAD</span>
          ${
            sbgl.length
              ? sbgl
                  .map(
                    (officer) => `
                      <div class="org-leader-name">
                        ${escapeHTML(officer.name)}
                      </div>
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
                    (officer) => `
                      <div class="org-leader-name">
                        ${escapeHTML(officer.name)}
                      </div>
                    `,
                  )
                  .join("")
              : `<div class="org-leader-name">Position vacant</div>`
          }
        </div>

      </div>

      <div class="org-connector" aria-hidden="true">
        <span></span>
      </div>

       <!-- EXECUTIVE OFFICE -->
      <section class="org-tier">
        <div class="org-tier-label">EXECUTIVE OFFICE</div>
        <div class="org-executive-grid">
          ${
            executiveTeam.length
              ? executiveTeam.map((officer) => personCard(officer)).join("")
              : empty
          }
        </div>
      </section>

      <div class="org-connector org-connector-long" aria-hidden="true">
        <span></span>
      </div>

      <!-- FUNCTIONAL OFFICES -->
      <section class="org-functional">
        <div class="org-tier-label">FUNCTIONAL OFFICES</div>
        <div class="org-functional-grid">
          ${officeMarkup}
        </div>
      </section>

      <div class="org-chart-footer">
        <span>AWS Student Builder Group - Colegio de Muntinlupa</span>
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

  // Program codes (e.g. "CpE") shown as their full names from the form's dropdown.
  const programNames = Object.fromEntries(
    [...($("officer-program")?.options ?? [])]
      .filter((option) => option.value)
      .map((option) => [option.value, option.textContent.trim()]),
  );

  const filtered = officerRecords.filter((officer) => {
    const positions = getOfficerPositions(officer);
    const name = officer.name.toLowerCase();
    const officeText = getOfficerOfficeText(officer);
    const positionText = getOfficerPositionText(officer);
    const yearText = officer.academicYear || "";

    const matchesSearch = [
      name,
      officeText,
      positionText,
      yearText,
      officer.studentNumber,
      officer.cdmEmail,
      officer.personalEmail,
      officer.contactNumber,
      officer.program,
      programNames[officer.program],
    ].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(search),
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

  // Accepts YYYY-MM-DD or MM-DD-YYYY and shows e.g. "Mar 5, 2004".
  const formatBirthdate = (value) => {
    const text = String(value ?? "").trim();
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let year, month, day;

    if (match) {
      [, year, month, day] = match;
    } else if ((match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/))) {
      [, month, day, year] = match;
    } else {
      return text;
    }

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const emptyCell = '<span class="officer-cell-empty">—</span>';
  const cell = (label, value, { email = false } = {}) => {
    // On phone cards an email may wrap after the "@" instead of mid-word.
    const text = escapeHTML(value);
    return `<td data-label="${label}">${
      value
        ? email
          ? text.replace(
              /@(.*)$/,
              '@<span class="officer-email-domain">$1</span>',
            )
          : text
        : emptyCell
    }</td>`;
  };

  list.innerHTML = `
      <div class="table-wrap officer-table-wrap">
        <table class="officer-table">
          <thead>
            <tr>
              <th scope="col">Officer Name</th>
              <th scope="col">Program</th>
              <th scope="col">Student number</th>
              <th scope="col">Birthdate</th>
              <th scope="col">CDM email</th>
              <th scope="col">Personal email</th>
              <th scope="col">Cell number</th>
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

                const programName =
                  programNames[officer.program] || officer.program || "";

                return `
                <tr>
                  <td data-label="Officer">
                    <span class="officer-name-cell">
                      ${escapeHTML(officer.name)}
                    </span>
                  </td>
                  <!--${
                    programName
                      ? `<span class="officer-cell-sub">${escapeHTML(programName)}</span>`
                      : ""
                  }-->
                  ${cell("Program", programName)}
                  ${cell("Student number", officer.studentNumber)}
                  ${cell("Birthdate", formatBirthdate(officer.birthdate))}
                  ${cell("CDM email", officer.cdmEmail, { email: true })}
                  ${cell("Personal email", officer.personalEmail, { email: true })}
                  ${cell("Cell number", officer.contactNumber)}
                  ${cell("Office", offices.join(", "))}
                  ${cell("Position", titles.join(", "))}
                  ${cell("Academic year", years.join(", ") || officer.academicYear)}
                  <td data-label="Status">
                    <span class="status-badge ${
                      officer.status === "published"
                        ? "status-published"
                        : "status-draft"
                    }">
                      ${officer.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td data-label="Actions">
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

  // Connect each dynamically rendered Edit button to the officer modal.
  list.querySelectorAll(".officer-edit-button").forEach((button) => {
    button.addEventListener("click", () => {
      const officerId = button.dataset.officerId;
      const officer = officerRecords.find(
        (item) => String(item.id) === String(officerId),
      );

      if (officer) {
        openOfficerModal(officer);
      }
    });
  });

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

// Convert Basic Information native select sources into the same custom dropdown
// component used by the Officers status filter, while keeping the original select
// in the form for validation and existing data handling.
function enhanceOfficerFormSelect(select) {
  if (!select || select.dataset.customized === "true") return;
  select.dataset.customized = "true";
  const dropdown = document.createElement("div");
  dropdown.className = "officer-select officer-basic-select";
  dropdown.dataset.sourceId = select.id;
  dropdown.dataset.value = select.value;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "officer-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const label = document.createElement("span");
  label.className = "officer-select-label";
  const chevron = document.createElement("span");
  chevron.className = "officer-select-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "⌄";
  trigger.append(label, chevron);
  const menu = document.createElement("div");
  menu.className = "officer-select-menu";
  menu.hidden = true;
  menu.setAttribute("role", "listbox");
  menu.setAttribute(
    "aria-label",
    select.labels?.[0]?.textContent || select.name,
  );
  [...select.options].forEach((opt) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "officer-select-option";
    item.dataset.value = opt.value;
    item.setAttribute("role", "option");
    const text = document.createElement("span");
    text.textContent = opt.textContent;
    const check = document.createElement("span");
    check.className = "option-check";
    check.textContent = "✓";
    item.append(text, check);
    menu.append(item);
  });
  select.insertAdjacentElement("afterend", dropdown);
  dropdown.append(trigger, menu);
  select.classList.add("custom-select-source-hidden");
  function sync(value = select.value) {
    dropdown.dataset.value = value;
    const option =
      [...menu.querySelectorAll(".officer-select-option")].find(
        (x) => x.dataset.value === value,
      ) || menu.querySelector(".officer-select-option");
    menu.querySelectorAll(".officer-select-option").forEach((x) => {
      const chosen = x === option;
      x.classList.toggle("selected", chosen);
      x.setAttribute("aria-selected", String(chosen));
    });
    label.textContent =
      option?.querySelector("span")?.textContent || "Select an option";
  }
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const opening = menu.hidden;
    document
      .querySelectorAll(".officer-select-menu")
      .forEach((m) => (m.hidden = true));
    document
      .querySelectorAll(".officer-select-trigger")
      .forEach((t) => t.setAttribute("aria-expanded", "false"));
    menu.hidden = !opening;
    trigger.setAttribute("aria-expanded", String(opening));
  });
  menu.addEventListener("click", (event) => {
    const option = event.target.closest(".officer-select-option");
    if (!option) return;
    select.value = option.dataset.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    sync(select.value);
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  });
  select.addEventListener("change", () => sync(select.value));
  sync();
  select._customDropdownSync = sync;
}

function syncOfficerFormSelects() {
  [$("officer-program"), $("officer-year-level")].forEach((select) => {
    select?._customDropdownSync?.();
  });
}

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

let officerPhotoFile = null;
let officerPhotoObjectUrl = null;

/* ========================================
   OFFICER MODAL: FOCUS AND SCROLL CONTROL
======================================== */

let officerModalReturnFocus = null;

function openOfficerModal(officer = null) {
  const modal = $("officer-form-panel");
  const form = $("officer-form");

  // Remember the element that opened the modal.
  officerModalReturnFocus = document.activeElement;

  // Reset the form for a new officer.
  form.reset();
  $("officer-id").value = "";
  $("officer-positions-list").replaceChildren();

  // Clear the custom birthdate value and display.
  $("officer-birthdate").value = "";
  $("officer-birthdate-display").textContent = "Choose a birthdate";

  // Reset the calendar to the current month.
  const today = new Date();
  officerBirthdateMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  $("officer-birthdate-month-select").value = String(today.getMonth());
  $("officer-birthdate-year-select").value = String(today.getFullYear());

  // Close the calendar and reset its trigger state.
  officerBirthdateCalendar.hidden = true;
  $("officer-birthdate-trigger").setAttribute("aria-expanded", "false");

  renderOfficerBirthdateCalendar();

  // Reset optional photo selection; intentionally no image preview.
  officerPhotoFile = null;
  $("officer-photo-file").value = "";
  $("officer-photo-file").dataset.existingPhoto = "";
  $("officer-photo-filename").textContent = "No photo selected";
  $("officer-photo-remove").hidden = true;

  if (officer) {
    // Populate these fields when editing an existing officer.
    $("officer-id").value = officer.officerId ?? officer.id ?? "";
    $("officer-name").value = officer.name ?? "";
    $("officer-program").value = officer.program ?? "";
    $("officer-student-number").value = officer.studentNumber ?? "";
    $("officer-year-level").value = officer.yearLevel ?? "";
    $("officer-cdm-email").value = officer.cdmEmail ?? "";
    $("officer-personal-email").value = officer.personalEmail ?? "";
    $("officer-contact").value = officer.contactNumber ?? "";

    const birthdate = String(officer.birthdate ?? "");
    const isoBirthdate = birthdate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      ? birthdate
      : birthdate.match(/^(\d{2})-(\d{2})-(\d{4})$/)
        ? `${birthdate.slice(6, 10)}-${birthdate.slice(0, 2)}-${birthdate.slice(3, 5)}`
        : "";
    $("officer-birthdate").value = isoBirthdate;
    $("officer-birthdate-display").textContent =
      formatOfficerBirthdate(isoBirthdate);

    const positions = Array.isArray(officer.positions) ? officer.positions : [];

    positions.forEach((position) => addOfficerPositionRow(position));

    $("officer-form-heading").textContent = "Edit officer";
    $("officer-publish").textContent = "Update and Publish";
  } else {
    $("officer-form-heading").textContent = "Add officer";
    $("officer-publish").textContent = "Publish Officer";
    addOfficerPositionRow();
  }

  // Clear stale browser validation messages.
  [
    $("officer-birthdate"),
    $("officer-contact"),
    $("officer-cdm-email"),
  ].forEach((input) => input.setCustomValidity(""));

  syncOfficerFormSelects();
  if (!modal.open) {
    modal.showModal();
  }

  document.body.classList.add("officer-modal-open");
  $("officer-name").focus();
}

function closeOfficerModal() {
  const modal = $("officer-form-panel");

  if (modal.open) {
    modal.close();
  }
}

function restoreOfficerModalFocus() {
  document.body.classList.remove("officer-modal-open");

  if (officerPhotoObjectUrl) {
    URL.revokeObjectURL(officerPhotoObjectUrl);
    officerPhotoObjectUrl = null;
  }

  if (officerModalReturnFocus?.isConnected) {
    officerModalReturnFocus.focus();
  }

  officerModalReturnFocus = null;
}

const officerModal = $("officer-form-panel");

$("officer-form-cancel").addEventListener("click", closeOfficerModal);
$("officer-modal-close").addEventListener("click", closeOfficerModal);

officerModal.addEventListener("close", restoreOfficerModalFocus);

/* ========================================
   OFFICER FORM VALIDATION
======================================== */

let officerBirthdateMonth = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1,
);

const officerBirthdateCalendar = $("officer-birthdate-calendar");

function formatOfficerBirthdate(value) {
  if (!value) return "Choose a birthdate";

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function populateBirthdateSelectors() {
  const monthSelect = $("officer-birthdate-month-select");
  const yearSelect = $("officer-birthdate-year-select");
  const currentYear = new Date().getFullYear();

  monthSelect.replaceChildren();

  for (let month = 0; month < 12; month++) {
    const option = document.createElement("option");
    option.value = String(month);
    option.textContent = new Date(2000, month, 1).toLocaleDateString("en-US", {
      month: "long",
    });
    monthSelect.append(option);
  }

  yearSelect.replaceChildren();

  for (let year = currentYear; year >= 1900; year--) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearSelect.append(option);
  }
}

function renderOfficerBirthdateCalendar() {
  const year = officerBirthdateMonth.getFullYear();
  const month = officerBirthdateMonth.getMonth();
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  $("officer-birthdate-month-select").value = String(month);
  $("officer-birthdate-year-select").value = String(year);

  $("officer-birthdate-prev").disabled = year <= 1900 && month === 0;
  $("officer-birthdate-next").disabled =
    year === today.getFullYear() && month === today.getMonth();

  const days = $("officer-birthdate-days");
  days.replaceChildren();

  const firstDay = new Date(year, month, 1).getDay();
  const numberOfDays = new Date(year, month + 1, 0).getDate();
  const selected = $("officer-birthdate").value;

  for (let i = 0; i < firstDay; i++) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-empty";
    days.append(spacer);
  }

  for (let day = 1; day <= numberOfDays; day++) {
    const date = new Date(year, month, day);
    const value = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = String(day);
    button.disabled = date > today;

    if (value === selected) button.classList.add("selected");
    if (date.getTime() === today.getTime()) button.classList.add("today");

    button.addEventListener("click", () => {
      $("officer-birthdate").value = value;
      $("officer-birthdate-display").textContent =
        formatOfficerBirthdate(value);

      officerBirthdateCalendar.hidden = true;
      $("officer-birthdate-trigger").setAttribute("aria-expanded", "false");
      $("officer-birthdate-trigger").focus();
    });

    days.append(button);
  }
}

populateBirthdateSelectors();

function getAcademicYearChoices() {
  const start = 2020;
  const current = new Date().getFullYear();
  const years = [];
  for (let year = current + 1; year >= start; year--)
    years.push(`${year}-${year + 1}`);
  return years;
}

// Student number is a text field, not an academic-year selector.

$("officer-birthdate-month-select").addEventListener("change", (event) => {
  officerBirthdateMonth = new Date(
    officerBirthdateMonth.getFullYear(),
    Number(event.target.value),
    1,
  );
  renderOfficerBirthdateCalendar();
});

$("officer-birthdate-year-select").addEventListener("change", (event) => {
  officerBirthdateMonth = new Date(
    Number(event.target.value),
    officerBirthdateMonth.getMonth(),
    1,
  );
  renderOfficerBirthdateCalendar();
});

const officerBirthdateTrigger = $("officer-birthdate-trigger");

if (officerBirthdateTrigger && officerBirthdateCalendar) {
  officerBirthdateTrigger.addEventListener("click", () => {
    const opening = officerBirthdateCalendar.hidden;

    officerBirthdateCalendar.hidden = !opening;

    officerBirthdateTrigger.setAttribute("aria-expanded", String(opening));

    if (opening) {
      const selected = $("officer-birthdate").value;
      const parts = selected
        ? selected.split("-").map(Number)
        : [new Date().getFullYear(), new Date().getMonth() + 1, 1];

      officerBirthdateMonth = new Date(parts[0], parts[1] - 1, 1);

      renderOfficerBirthdateCalendar();
    }
  });
} else {
  console.error("Birthdate trigger or calendar element not found.", {
    trigger: officerBirthdateTrigger,
    calendar: officerBirthdateCalendar,
  });
}

$("officer-birthdate-prev").addEventListener("click", () => {
  officerBirthdateMonth = new Date(
    officerBirthdateMonth.getFullYear(),
    officerBirthdateMonth.getMonth() - 1,
    1,
  );
  renderOfficerBirthdateCalendar();
});

$("officer-birthdate-next").addEventListener("click", () => {
  officerBirthdateMonth = new Date(
    officerBirthdateMonth.getFullYear(),
    officerBirthdateMonth.getMonth() + 1,
    1,
  );
  renderOfficerBirthdateCalendar();
});

const officerBirthdateClear = $("officer-birthdate-clear");

if (officerBirthdateClear) {
  officerBirthdateClear.addEventListener("click", () => {
    $("officer-birthdate").value = "";
    $("officer-birthdate-display").textContent = "Choose a birthdate";

    officerBirthdateCalendar.hidden = true;

    officerBirthdateTrigger?.setAttribute("aria-expanded", "false");
    officerBirthdateTrigger?.focus();
  });
}

$("officer-birthdate-today").addEventListener("click", () => {
  const today = new Date();
  officerBirthdateMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  renderOfficerBirthdateCalendar();
});

// Photo selection only. No image preview is shown; persistent upload storage is separate.
$("officer-photo-file").addEventListener("change", () => {
  const file = $("officer-photo-file").files?.[0];
  const filename = $("officer-photo-filename");
  const removeButton = $("officer-photo-remove");
  if (!file) {
    filename.textContent = "No photo selected";
    removeButton.hidden = true;
    officerPhotoFile = null;
    return;
  }
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    showNotice("Choose a JPG, PNG, or WebP image file.", "error");
    $("officer-photo-file").value = "";
    filename.textContent = "No photo selected";
    officerPhotoFile = null;
    removeButton.hidden = true;
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showNotice("The photo must be 5 MB or smaller.", "error");
    $("officer-photo-file").value = "";
    filename.textContent = "No photo selected";
    officerPhotoFile = null;
    removeButton.hidden = true;
    return;
  }
  officerPhotoFile = file;
  filename.textContent = file.name;
  removeButton.hidden = false;
});

$("officer-photo-remove").addEventListener("click", () => {
  officerPhotoFile = null;
  $("officer-photo-file").value = "";
  $("officer-photo-file").dataset.existingPhoto = "";
  $("officer-photo-filename").textContent = "No photo selected";
  $("officer-photo-remove").hidden = true;
});

$("new-officer-button").addEventListener("click", () => {
  openOfficerModal();
});

function addOfficerPositionRow(position = {}) {
  const row = document.createElement("div");
  row.className = "officer-position-row";

  const fields = [
    {
      key: "office",
      label: "Office",
      options: [
        "Executive",
        "Creatives",
        "Finance",
        "Technology",
        "Relations",
        "Marketing",
        "Operations",
      ],
    },
    {
      key: "title",
      label: "Position title",
      type: "input",
      placeholder: "e.g. President",
    },
    { key: "year", label: "Academic year", options: getAcademicYearChoices() },
  ];

  fields.forEach(({ key, label, type, options = [], placeholder = "" }) => {
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    const inputLabel = document.createElement("label");
    inputLabel.textContent = `${label} *`;

    if (type === "input") {
      const input = document.createElement("input");
      input.name = key;
      input.dataset.positionField = key;
      input.required = true;
      input.placeholder = placeholder;
      input.value = position[key] ?? "";
      input.id = `officer-position-${key}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      inputLabel.htmlFor = input.id;
      wrapper.append(inputLabel, input);
    } else {
      // Reuse the same custom dropdown pattern as the Officers status filters.
      const dropdown = document.createElement("div");
      dropdown.className = "officer-select officer-position-select";
      dropdown.dataset.value = position[key] ?? "";
      dropdown.dataset.positionField = key;

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "officer-select-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");
      const labelSpan = document.createElement("span");
      labelSpan.className = "officer-select-label";
      labelSpan.textContent =
        position[key] ||
        (key === "office" ? "Select office" : "Select academic year");
      const chevron = document.createElement("span");
      chevron.className = "officer-select-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "⌄";
      trigger.append(labelSpan, chevron);

      const menu = document.createElement("div");
      menu.className = "officer-select-menu";
      menu.hidden = true;
      menu.setAttribute("role", "listbox");
      options.forEach((value) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "officer-select-option";
        option.dataset.value = value;
        option.setAttribute("role", "option");
        option.setAttribute(
          "aria-selected",
          String(value === (position[key] ?? "")),
        );
        const text = document.createElement("span");
        text.textContent = value;
        const check = document.createElement("span");
        check.className = "option-check";
        check.textContent = "✓";
        option.classList.toggle("selected", value === (position[key] ?? ""));
        option.append(text, check);
        menu.append(option);
      });
      dropdown.append(trigger, menu);
      inputLabel.htmlFor = "";
      wrapper.append(inputLabel, dropdown);
      setupOfficerDropdown(dropdown);
    }
    row.appendChild(wrapper);
  });

  const actions = document.createElement("div");
  actions.className = "field position-row-actions";
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "button button-light";
  removeButton.textContent = "Remove position";
  removeButton.addEventListener("click", () => row.remove());
  actions.appendChild(removeButton);
  row.appendChild(actions);
  $("officer-positions-list").appendChild(row);
}

$("add-officer-position").addEventListener("click", (event) => {
  event.preventDefault();
  addOfficerPositionRow();
});

// Officer CRUD: the Lambda already supports POST, PUT and DELETE.
$("officer-list").addEventListener("click", async (event) => {
  const button = event.target.closest(".officer-delete-button");
  if (!button) return;
  const officerId = button.dataset.officerId;
  const officer = officerRecords.find(
    (item) => String(item.id) === String(officerId),
  );
  if (!officerId || !officer) return;
  if (
    !confirm(
      `Delete the officer profile for "${officer.name}"? This cannot be undone.`,
    )
  )
    return;
  button.disabled = true;
  try {
    await apiRequest(`${OFFICERS_API_BASE}/${encodeURIComponent(officerId)}`, {
      method: "DELETE",
    });
    showNotice(`Deleted ${officer.name}.`, "success");
    await loadOfficers();
  } catch (error) {
    showNotice(error.message || "Unable to delete officer.", "error");
  } finally {
    button.disabled = false;
  }
});

$("officer-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const action = event.submitter?.value;

  if (action !== "draft" && action !== "published") {
    showNotice("Please choose Save as Draft or Publish Officer.", "error");
    return;
  }

  const form = $("officer-form");

  // Read the dynamically generated position rows.
  const positionRows = [
    ...$("officer-positions-list").querySelectorAll(".officer-position-row"),
  ];

  const positions = positionRows.map((row) => ({
    office:
      row
        .querySelector('[data-position-field="office"]')
        ?.dataset.value?.trim() ?? "",
    title:
      row.querySelector('[data-position-field="title"]')?.value?.trim() ?? "",
    year:
      row
        .querySelector('[data-position-field="year"]')
        ?.dataset.value?.trim() ?? "",
  }));

  // Match Org Adviser and Organization Adviser, ignoring capitalization.
  const isOrgAdviser = (position) =>
    /^(?:adviser|advisor|org\s+adviser|org\s+advisor|organization\s+adviser|organization\s+advisor)$/i.test(
      position.title.trim(),
    );

  const isAdviser = positions.some(isOrgAdviser);

  // These fields are mandatory for student officers, but not for an adviser.
  [
    $("officer-program"),
    $("officer-student-number"),
    $("officer-year-level"),
  ].forEach((field) => {
    if (field) {
      field.required = !isAdviser;
      field.setCustomValidity("");
    }
  });

  // Academic year is required for student positions, but not for Org Adviser.
  const positionsValid =
    positions.length > 0 &&
    positions.every(
      (position) =>
        Boolean(position.office) &&
        Boolean(position.title) &&
        (isOrgAdviser(position) || Boolean(position.year)),
    );

  if (!positionsValid) {
    showNotice(
      "Complete the office and position title for every position. Academic year is required for student positions, but not for the Org Adviser.",
      "error",
    );
    return;
  }

  // Validate the remaining required form fields after adjusting student-only fields.
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Officer-level academic year = the most recent year among student positions.
  const academicYear =
    [
      ...new Set(
        positions
          .filter((position) => !isOrgAdviser(position))
          .map((position) => position.year)
          .filter(Boolean),
      ),
    ]
      .sort()
      .reverse()[0] || "";
  const payload = {
    name: $("officer-name").value.trim(),
    program: $("officer-program").value,
    studentNumber: $("officer-student-number").value.trim(),
    yearLevel: $("officer-year-level").value,
    academicYear,
    cdmEmail: $("officer-cdm-email").value.trim(),
    personalEmail: $("officer-personal-email").value.trim(),
    contactNumber: $("officer-contact").value.trim(),
    birthdate: $("officer-birthdate").value,
    photo: $("officer-photo-file").dataset.existingPhoto || "",
    positions,
  };

  if (
    !payload.name ||
    (!isAdviser && !payload.program) ||
    (!isAdviser && !payload.studentNumber) ||
    (!isAdviser && !payload.yearLevel) ||
    !payload.birthdate ||
    !payload.cdmEmail ||
    !payload.contactNumber
  ) {
    showNotice(
      isAdviser
        ? "Complete the required Org Adviser fields."
        : "Complete all required officer fields.",
      "error",
    );
    return;
  }

  const officerId = $("officer-id").value;
  const buttons = [$("officer-save-draft"), $("officer-publish")];
  const clickedButton = event.submitter;

  const originalLabels = buttons.map((button) => button.textContent);

  buttons.forEach((button) => {
    button.disabled = true;
  });

  if (clickedButton) {
    clickedButton.textContent = "Saving...";
  }

  try {
    const url = officerId
      ? `${OFFICERS_API_BASE}/${encodeURIComponent(officerId)}`
      : OFFICERS_API_BASE;

    await apiRequest(url, {
      method: officerId ? "PUT" : "POST",
      body: JSON.stringify({
        ...payload,
        status: action,
      }),
    });

    showNotice(
      action === "published"
        ? officerId
          ? "Officer updated and published successfully."
          : "Officer published successfully."
        : officerId
          ? "Officer changes saved as draft."
          : "Officer saved as draft.",
      "success",
    );

    closeOfficerModal();
    await loadOfficers();
  } catch (error) {
    showNotice(
      error.message || "Unable to save officer. Please try again.",
      "error",
    );
  } finally {
    buttons.forEach((button, index) => {
      button.disabled = false;
      button.textContent = originalLabels[index];
    });
  }
});
// Closes the officer-form submit listener

updateOfficerYearOptions();
updateOfficerStats();
renderOfficers();
enhanceOfficerFormSelect($("officer-program"));
enhanceOfficerFormSelect($("officer-year-level"));

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

// Add signInWithRedirect to your import at the top:
// import { fetchAuthSession, getCurrentUser, signOut, signInWithRedirect } from "../amplify.js";

try {
  const user = await getCurrentUser();
  const session = await fetchAuthSession();
  const idTokenValue = session.tokens?.idToken;

  if (!user || !idTokenValue) {
    window.location.replace("/admin/");
  } else {
    const payload = idTokenValue.payload ?? {};

    // Check Cognito administrator group membership.
    const groups = payload["cognito:groups"] ?? [];

    const isAdmin =
      Array.isArray(groups) && groups.includes("Admins");

    if (!isAdmin) {
      console.warn("Dashboard access denied: user is not an administrator.");

      await signOut();
      window.location.replace("/admin/?error=access-denied");
      throw new Error("Administrator access required.");
    }

    // Continue only after administrator authorization succeeds.
    idToken = idTokenValue.toString();

    setProfile({
      profile: {
        name: payload.name || payload.nickname || "",
        email: payload.email || "",
        preferred_username: payload.preferred_username || "",
        username: user.username || "",
      },
    });

    management.hidden = false;

    await loadEvents();
  }
} catch (error) {
  console.error("Unable to verify the Cognito administrator session:", error);

  if (error.message !== "Administrator access required.") {
    window.location.replace("/admin/");
  }
}
