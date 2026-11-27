import { bindBirthdatePicker, formatBirthdate } from "./birthdate-picker.js";
/*
  Dashboard operations module.
  Handles Cognito authorization, events, officer records, officer/modals,
  dropdowns, custom pickers, and event/registration workspace interactions.
  Uses ay.js for academic-year logic and members.js for shared member data.
*/
import { fetchAuthSession, getCurrentUser, signOut } from "../amplify.js";
import {
  academicYearSelection,
  formatAcademicYearLabel,
  OFFICE_ORDER,
  getPositionTitleRank,
  getAcademicYearChoices,
} from "./ay.js";

// ==========================================
// SETTINGS AND SHARED PAGE ELEMENTS
// ==========================================
// Web addresses of the events and officers services, plus page elements used
// in many places below. These addresses are only READ here; nothing about the
// backend is changed by this file.

const EVENTS_API_BASE_URL =
  "https://xxbmakdu4d.execute-api.us-east-1.amazonaws.com/prod/admin/events";

const OFFICERS_API_BASE_URL =
  "https://xxbmakdu4d.execute-api.us-east-1.amazonaws.com/prod/admin/officers";

/**
 * Shortcut for finding one element on the page by its id.
 *
 * @param {*} elementId - The id attribute of the element, for example "events-body".
 * @returns {HTMLElement|null} The element, or null when it does not exist.
 */
const getElementById = (elementId) => document.getElementById(elementId);
let noticeElement = getElementById("notice");
const eventFormPanel = getElementById("event-form-panel");
const eventsBody = getElementById("events-body");

let idToken = null;
let eventRecords = [];
// Read-only view of loaded records for the Overview (dashboard-shell.js).
window.__sbgData = {
  get events() {
    return eventRecords;
  },
  get officers() {
    return officerRecords;
  },
};

// Custom event date picker
// ==========================================
// EVENT FORM: DATE PICKER
// ==========================================
// The custom calendar used to choose an event date.

const dateInput = getElementById("date");
const dateTrigger = getElementById("date-picker-trigger");
const dateDisplay = getElementById("date-display");
const calendarPopup = getElementById("calendar-popup");
const calendarMonth = getElementById("calendar-month");
const calendarDays = getElementById("calendar-days");
calendarPopup._owner = calendarPopup.parentElement;

/*
  Converts a Date to YYYY-MM-DD for hidden event form values.
  It uses local Date fields instead of an ISO timestamp to avoid timezone shifts.
*/
function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/*
  Positions event date/time popovers in the viewport from the trigger rectangle.
  It flips above the trigger when insufficient space remains below.
*/
function positionCustomPopup(trigger, popup) {
  if (!trigger || !popup) return;
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(340, window.innerWidth - 16);
  const height = popup.offsetHeight || 280;
  let left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left));
  let top = rect.bottom + 8;
  if (top + height > window.innerHeight - 8)
    top = Math.max(8, rect.top - height - 8);
  popup.style.position = "fixed";
  popup.style.zIndex = "20050";
  popup.style.width = `${width}px`;
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

/**
 * Opens a calendar/time popup and places it beside the button that opened it.
 * The popup is moved to the end of <body> so no parent box can cut it off.
 *
 * @param {*} triggerElement - The button that opens the popup.
 * @param {*} popupElement - The popup box to show.
 */
function openCustomPopup(triggerElement, popupElement) {
  if (!popupElement) return;
  document.body.append(popupElement);
  popupElement.hidden = false;
  triggerElement?.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => positionCustomPopup(triggerElement, popupElement));
}

/**
 * Closes a popup and puts it back inside its original parent element.
 *
 * @param {*} triggerElement - The button that opened the popup.
 * @param {*} popupElement - The popup box to hide.
 */
function closeCustomPopup(triggerElement, popupElement) {
  if (!popupElement) return;
  popupElement.hidden = true;
  triggerElement?.setAttribute("aria-expanded", "false");
  popupElement._owner?.append(popupElement);
}

/*
  Builds the event date-picker month grid and disabled past dates.
  Selecting a day updates the hidden date value and visible date label.
*/
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

  for (let blankDayIndex = 0; blankDayIndex < firstDay; blankDayIndex++) {
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
      calendarPopup._owner?.append(calendarPopup);
      dateTrigger.setAttribute("aria-expanded", "false");
      renderCalendar();
    });

    calendarDays.appendChild(button);
  }

  getElementById("calendar-prev").disabled =
    year === now.getFullYear() && month === now.getMonth();
}

let visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

dateTrigger.addEventListener("click", () => {
  const opening = calendarPopup.hidden;
  if (opening) {
    renderCalendar();
    openCustomPopup(dateTrigger, calendarPopup);
    closeCustomPopup(timeTrigger, timePopup);
  } else {
    closeCustomPopup(dateTrigger, calendarPopup);
  }
});

getElementById("calendar-prev").addEventListener("click", () => {
  visibleMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() - 1,
    1,
  );
  renderCalendar();
});

getElementById("calendar-next").addEventListener("click", () => {
  visibleMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    1,
  );
  renderCalendar();
});

renderCalendar();

// ==========================================
// EVENT FORM: TIME PICKER
// ==========================================
// The custom start/end time picker and the duration text beside it.

const timeTrigger = getElementById("time-picker-trigger");
const timePopup = getElementById("time-popup");
const timeInput = getElementById("time");
const timeDisplay = getElementById("time-display");
timePopup._owner = timePopup.parentElement;

const startTimeInput = getElementById("start-time");
const endTimeInput = getElementById("end-time");
const durationValue = getElementById("time-duration-value");
const timeError = getElementById("time-error");

let savedStartTime = "";
let savedEndTime = "";
let eventFormBaseline = "";

/*
  Serializes event form values into a baseline used to detect unsaved changes.
*/
function eventFormSnapshot() {
  return JSON.stringify({
    title: getElementById("title").value,
    date: getElementById("date").value,
    location: getElementById("location").value,
    time: getElementById("time").value,
  });
}

/**
 * Converts a 24-hour time such as "14:30" into display text such as "02:30 PM".
 *
 * @param {*} timeValue24Hour - Time in HH:MM 24-hour format.
 * @returns {string} The 12-hour text, or "" when no time was given.
 */
function formatTime(timeValue24Hour) {
  if (!timeValue24Hour) return "";

  const [hourText, minute] = timeValue24Hour.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
}

/**
 * Reads saved text like "09:00 AM – 11:30 AM" and returns the start and end
 * times in 24-hour format so they can fill the time inputs.
 *
 * @param {*} timeRangeText - The saved time range text.
 * @returns {string[]} [startTime, endTime], or two empty strings when the text is not a valid range.
 */
function parseTimeRange(timeRangeText) {
  const match = timeRangeText.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );

  if (!match) return ["", ""];

  function to24Hour(hour, minute, period) {
    let hourIn12HourClock = Number(hour) % 12;
    if (period.toUpperCase() === "PM") hourIn12HourClock += 12;
    return `${String(hourIn12HourClock).padStart(2, "0")}:${minute}`;
  }

  return [
    to24Hour(match[1], match[2], match[3]),
    to24Hour(match[4], match[5], match[6]),
  ];
}

/*
  Validates the selected start/end time range and formats the duration label.
*/
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

/**
 * Closes the time picker popup.
 */
function closeTimePicker() {
  timePopup.hidden = true;
  timeTrigger.setAttribute("aria-expanded", "false");
  timePopup._owner?.append(timePopup);
}

/**
 * Opens the time picker popup and shows the currently chosen times.
 */
function openTimePicker() {
  // Preserve the last applied selection when reopening the picker.
  startTimeInput.value = savedStartTime;
  endTimeInput.value = savedEndTime;
  timeError.hidden = true;
  updateDuration();

  openCustomPopup(timeTrigger, timePopup);

  calendarPopup.hidden = true;
  dateTrigger.setAttribute("aria-expanded", "false");
  calendarPopup._owner?.append(calendarPopup);
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

getElementById("time-apply").addEventListener("click", () => {
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

getElementById("time-clear").addEventListener("click", () => {
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

getElementById("time-cancel").addEventListener("click", closeTimePicker);

document.addEventListener("click", (event) => {
  if (!event.target.closest("#date-picker") && !calendarPopup.contains(event.target)) {
    closeCustomPopup(dateTrigger, calendarPopup);
  }
  if (!event.target.closest("#time-picker") && !timePopup.contains(event.target)) {
    closeCustomPopup(timeTrigger, timePopup);
  }
});

window.addEventListener("resize", () => {
  if (!calendarPopup.hidden) positionCustomPopup(dateTrigger, calendarPopup);
  if (!timePopup.hidden) positionCustomPopup(timeTrigger, timePopup);
});

window.addEventListener(
  "scroll",
  () => {
    if (!calendarPopup.hidden) positionCustomPopup(dateTrigger, calendarPopup);
    if (!timePopup.hidden) positionCustomPopup(timeTrigger, timePopup);
  },
  true,
);

/*
  Creates a temporary toast notice for success, error, and status feedback.
*/
// ==========================================
// NOTICES, PROFILE MENU AND API REQUESTS
// ==========================================
// Small messages (toasts), the signed-in administrator's name, and the helper
// that talks to the events/officers services with the ID token.

function showNotice(message, type = "") {
  if (!noticeElement || !noticeElement.isConnected) {
    noticeElement = document.createElement("div");
    noticeElement.id = "notice";
    noticeElement.setAttribute("role", "status");
    noticeElement.setAttribute("aria-live", "polite");

    document.body.prepend(noticeElement);
  }

  noticeElement.textContent = String(message ?? "");
  noticeElement.className = `notice ${type}`.trim();
  clearTimeout(noticeElement._t);
  noticeElement._t = setTimeout(() => noticeElement.remove(), 4500);
}

/**
 * Shows the signed-in administrator's name, initials and email in the top-right menu.
 * The name is chosen from the Cognito details; the raw Cognito id is never used as a name.
 *
 * @param {*} authenticatedUser - An object with a "profile" holding name, email, preferred_username and username.
 */
function setProfile(authenticatedUser) {
  const profile = authenticatedUser.profile ?? {};

  const email = profile.email ?? authenticatedUser.email ?? "";

  // Prefer the person's actual name, then their chosen username.
  // Never use the Cognito sub UUID as the display name.
  const fullName =
    profile.name ||
    profile.preferred_username ||
    profile["cognito:username"] ||
    profile.username ||
    "Administrator";

  getElementById("profile-name").textContent = fullName;
  getElementById("profile-email").textContent = email;
  // Keep the sidebar account avatar as an icon rather than replacing it with initials.
  getElementById("welcome-name").textContent = fullName.split(/\s+/)[0];
}

/*
  Executes authenticated API requests and normalizes backend error messages.
  All event/officer network calls pass through this function.
*/
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

/*
  Clears event form values, custom picker state, and creates a new form baseline.
  hide controls whether the form closes immediately or remains open for creation.
*/
// ==========================================
// EVENT FORM: OPENING, CLOSING AND UNSAVED CHANGES
// ==========================================

function resetForm(hide = true) {
  getElementById("event-form").reset();
  getElementById("event-id").value = "";
  getElementById("form-heading").textContent = "Create event";
  getElementById("save-draft-button").textContent = "Save as Draft";
  getElementById("publish-button").textContent = "Publish Event";
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
  timePopup._owner?.append(timePopup);
  calendarPopup.hidden = true;
  dateTrigger.setAttribute("aria-expanded", "false");
  calendarPopup._owner?.append(calendarPopup);

  visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  renderCalendar();
  eventFormBaseline = eventFormSnapshot();

  eventFormBaseline = eventFormSnapshot();
  if (hide) closeEventForm();
}

/**
 * Tells whether the event form differs from how it looked when it was opened.
 * Used to warn before discarding unsaved changes.
 *
 * @returns {boolean} True when something was edited.
 */
function eventFormHasChanges() {
  return eventFormSnapshot() !== eventFormBaseline;
}

/*
  Applies the fade/scale exit transition before hiding the event form.
*/
function closeEventForm() {
  if (!eventFormPanel.hidden) {
    eventFormPanel.classList.remove("event-form-enter");
    eventFormPanel.classList.add("event-form-leave");
    window.setTimeout(() => {
      eventFormPanel.hidden = true;
      eventFormPanel.classList.remove("event-form-leave");
    }, 180);
  }
}

/*
  Confirms unsaved event changes before closing and restores trigger focus.
*/
function discardEventForm() {
  if (
    eventFormHasChanges() &&
    !window.confirm("Discard unsaved event changes?")
  )
    return;
  closeEventForm();
  getElementById("new-event-button").focus({ preventScroll: true });
}

/*
  Opens a fresh event form with a fade/scale entrance and focuses the title field.
*/
function openCreateForm() {
  resetForm(false);
  eventFormPanel.hidden = false;
  eventFormPanel.classList.remove("event-form-leave");
  eventFormPanel.classList.add("event-form-enter");
  window.setTimeout(() => eventFormPanel.classList.remove("event-form-enter"), 260);
  eventFormPanel.classList.remove("event-form-leave");
  eventFormPanel.classList.add("event-form-enter");
  window.setTimeout(() => eventFormPanel.classList.remove("event-form-enter"), 260);
  getElementById("title").focus();
  eventFormPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ==========================================
// EVENTS LIST AND STATISTICS
// ==========================================
// Loads events from the events service, draws the events table and the four
// statistic cards. Paging, sorting and searching are done by table-standard.js.

/**
 * Counts total, published, draft and upcoming events and writes them into the statistic cards.
 */
function updateStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  getElementById("total-events").textContent = eventRecords.length;
  getElementById("published-events").textContent = eventRecords.filter(
    (event) => event.status === "published",
  ).length;
  getElementById("draft-events").textContent = eventRecords.filter(
    (event) => event.status === "draft",
  ).length;
  getElementById("upcoming-events").textContent = eventRecords.filter(
    (event) => event.status === "published" && event.date >= todayString,
  ).length;
}

/*
  Filters loaded events and renders the event table current page.
  Event search/sorting/filtering can continue through the shared table enhancer.
*/
function renderEvents() {
  eventsBody.replaceChildren();

  const query = "";
  const filtered = eventRecords.filter((event) =>
    [event.title, event.date, event.location, event.status].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(query),
    ),
  );
  // Paging is handled by table-standard.js, so every matching event is rendered here.
  // (Slicing to 25 rows here as well used to hide every event after the 25th.)
  const pageItems = filtered;

  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-cell";
    cell.textContent = eventRecords.length
      ? "No events match your search."
      : "No events yet. Create your first event to get started.";
    row.append(cell);
    eventsBody.append(row);
    return;
  }

  for (const event of pageItems) {
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
      getElementById("event-id").value = event.eventId;
      getElementById("title").value = event.title ?? "";
      getElementById("date").value = event.date ?? "";
      dateDisplay.textContent = event.date
        ? new Date(`${event.date}T12:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Choose a date";
      renderCalendar();
      getElementById("location").value = event.location ?? "";
      getElementById("save-draft-button").textContent = "Save as Draft";
      getElementById("publish-button").textContent =
        event.status === "published" ? "Update & Publish" : "Publish Event";
      timeInput.value = event.time ?? "";
      timeDisplay.textContent = event.time || "Set event time range";

      [savedStartTime, savedEndTime] = parseTimeRange(event.time ?? "");

      startTimeInput.value = savedStartTime;
      endTimeInput.value = savedEndTime;
      updateDuration();
      getElementById("form-heading").textContent = "Edit event";
      eventFormPanel.hidden = false;
      eventFormBaseline = eventFormSnapshot();
      eventFormPanel.classList.remove("event-form-leave");
      eventFormPanel.classList.add("event-form-enter");
      window.setTimeout(
        () => eventFormPanel.classList.remove("event-form-enter"),
        260,
      );
      getElementById("title").focus();
      eventFormPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;

      try {
        await apiRequest(`${EVENTS_API_BASE_URL}/${encodeURIComponent(event.eventId)}`, {
          method: "DELETE",
        });
        showNotice("Event deleted successfully.", "success");
        await loadEvents();
      } catch (error) {
        showNotice(error.message, "error");
      }
    });

    const details = document.createElement("button");
    details.type = "button";
    details.textContent = "Details";
    details.addEventListener("click", () =>
      document.dispatchEvent(
        new CustomEvent("sbg:event-details", { detail: event }),
      ),
    );

    actions.append(details, edit, remove);
    actionsCell.append(actions);
    row.append(actionsCell);
    eventsBody.append(row);
  }
}

/*
  Fetches events from the API and refreshes event stats/table data.
  API failures are rendered as table feedback and a toast notice.
*/
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
    const data = await apiRequest(EVENTS_API_BASE_URL);
    eventRecords = Array.isArray(data) ? data : (data?.events ?? []);
    updateStats();
    renderEvents();
    document.dispatchEvent(new Event("sbg:data"));
  } catch (error) {
    eventsBody.replaceChildren();
    const errorRow = document.createElement("tr");
    const errorCell = document.createElement("td");
    errorCell.colSpan = 5;
    errorCell.className = "empty-cell";
    errorCell.textContent = error.message;
    errorRow.append(errorCell);
    eventsBody.append(errorRow);
    showNotice(error.message, "error");
  }
}

getElementById("new-event-button").addEventListener("click", openCreateForm);
// getElementById("panel-new-event").addEventListener("click", openCreateForm);

/*
  Fetches officer profiles and updates the directory, structure, and statistics.
  The loaded records are exposed to the Overview and reporting modules.
*/
async function loadOfficers() {
  try {
    const data = await apiRequest(OFFICERS_API_BASE_URL);
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
    document.dispatchEvent(new Event("sbg:data"));

    console.log("Officers loaded:", officerRecords.length);
  } catch (error) {
    console.error("Unable to load officers:", error);
    showNotice(error.message || "Unable to load officers.", "error");
  }
}

// ==========================================
// PAGE NAVIGATION
// ==========================================
// Decides which section of the dashboard is visible. dashboard-shell.js announces
// the page the administrator picked (the "sbg:navigate" event) and the functions
// below show the matching section and hide the others.

const VIEWS = {
  overview: "overview-view",
  events: "event-management",
  organization: "officers-management",
  officers: "officers-management",
  structure: "officers-management",
  settings: "settings-view",
  members: "members-view",
  reports: "reports-view",
};
const VIEW_LABELS = {
  overview: "Overview",
  events: "Registration & Events",
  organization: "Officers & Structure",
  officers: "Officers & Structure",
  structure: "Officers & Structure",
  settings: "Settings",
  members: "Members",
  reports: "Reports & Analytics",
};

// Restarts the entrance animation on an element.
const restartEntranceAnimation = (animatedElement) => {
  animatedElement.classList.remove("view-enter");
  void animatedElement.offsetWidth;
  animatedElement.classList.add("view-enter");
};

/**
 * Switches the Officers & Structure page between its two tabs.
 *
 * @param {*} mode - Either "structure" (the organization tree) or "directory" (the officers table).
 * @param {*} animate - Whether to play the small entrance animation.
 */
function setOrgMode(mode, animate = true) {
  getElementById("officers-management").dataset.mode = mode;
  document
    .querySelectorAll("#org-tabs [data-tab]")
    .forEach((tab) =>
      tab.setAttribute("aria-selected", String(tab.dataset.tab === mode)),
    );
  if (animate)
    restartEntranceAnimation(getElementById(mode === "structure" ? "structure-panel" : "directory-panel"));
}

/**
 * Shows one section of the dashboard and hides all the others.
 *
 * @param {*} view - The name of the page, for example "overview", "events" or "members".
 */
function showWorkspace(view = "overview") {
  if (!VIEWS[view]) return;
  new Set(Object.values(VIEWS)).forEach((elementId) => {
    getElementById(elementId).hidden = VIEWS[view] !== elementId;
  });
  restartEntranceAnimation(getElementById(VIEWS[view]));
  if (VIEWS[view] === "officers-management") {
    const current = getElementById("officers-management").dataset.mode || "structure";
    setOrgMode(
      view === "officers"
        ? "directory"
        : view === "structure"
          ? "structure"
          : current,
      false,
    );
  }

  const breadcrumb = document.querySelector(".breadcrumb");
  const currentPage = document.createElement("strong");
  currentPage.textContent = VIEW_LABELS[view];
  breadcrumb.replaceChildren("Workspace / ", currentPage);
}

getElementById("org-tabs").addEventListener("click", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (tab) setOrgMode(tab.dataset.tab);
});
document.addEventListener("sbg:navigate", (event) =>
  showWorkspace(event.detail),
);
document.addEventListener("sbg:ay", () => renderOfficerTree());
document.addEventListener("sbg:toast", (event) =>
  showNotice(event.detail.message, event.detail.type),
);

// ==========================================
// OFFICERS: DATA, FILTERS AND ORDERING
// ==========================================
// Helpers that read officer records. Inside every office, a Director comes first,
// then the Assistant Director, then everyone else, so the order is the same everywhere.

let officerRecords = [];

/**
 * Returns the list of positions an officer holds (an officer can hold several).
 *
 * @param {*} officer - One officer record from the officers service.
 * @returns {object[]} Positions with title, office and academic year.
 */
function getOfficerPositions(officer) {
  return Array.isArray(officer.positions) ? officer.positions : [];
}

/**
 * Builds comma-separated text of the offices an officer belongs to, for the table.
 *
 * @param {*} officer - One officer record.
 * @returns {string} For example "Creatives, Technology".
 */
function getOfficerOfficeText(officer) {
  return [
    ...new Set(getOfficerPositions(officer).map((position) => position.office)),
  ].join(", ");
}

/**
 * Builds comma-separated text of the position titles an officer holds, for the table.
 *
 * @param {*} officer - One officer record.
 * @returns {string} For example "Director, Assistant Director".
 */
function getOfficerPositionText(officer) {
  return [
    ...new Set(getOfficerPositions(officer).map((position) => position.title)),
  ].join(", ");
}

/**
 * Counts officers, offices, published and draft profiles and writes them into the statistic cards.
 */
function updateOfficerStats() {
  getElementById("officer-total").textContent = officerRecords.length;

  getElementById("officer-offices").textContent = new Set(
    officerRecords.flatMap((officer) =>
      getOfficerPositions(officer).map((position) => position.office),
    ),
  ).size;

  getElementById("officer-published").textContent = officerRecords.filter(
    (officer) => officer.status === "published",
  ).length;

  getElementById("officer-drafts").textContent = officerRecords.filter(
    (officer) => officer.status === "draft",
  ).length;
}

/**
 * Fills the academic-year filter with every year that appears in the officer records.
 */
function updateOfficerYearOptions() {
  const dropdown = document.querySelector(
    '.officer-select[data-filter="year"]',
  );

  if (!dropdown) return;

  const menu = dropdown.querySelector(".officer-select-menu");
  const trigger = dropdown.querySelector(".officer-select-trigger");
  const currentValue = dropdown.dataset.value || "all";

  const recordYears = [
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
  const years = [...new Set([...getAcademicYearChoices(), ...recordYears])]
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
    check.innerHTML = '<i data-icon="check"></i>';

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

// Remembers which org-tree branches the admin collapsed.
const closedOrgNodes = new Set();

// Director first, then Assistant Director, then everyone else, everywhere officers are listed.
const rankIn = (officer, office) =>
  Math.min(
    9,
    ...getOfficerPositions(officer)
      .filter(
        (position) =>
          !office ||
          String(position.office ?? "")
            .trim()
            .toLowerCase() === office.toLowerCase(),
      )
      .map((position) => getPositionTitleRank(position.title)),
  );
/**
 * Creates a sorting function that puts Directors first, then Assistant Directors, then others.
 *
 * @param {*} office - The office whose titles are compared.
 * @returns {Function} A comparison function usable with Array.sort().
 */
const byRank = (office) => (firstItem, secondItem) =>
  rankIn(firstItem, office) - rankIn(secondItem, office) ||
  String(firstItem.name).localeCompare(String(secondItem.name));
/**
 * Finds the position of an officer's earliest office in the fixed office order
 * (Executive, Creatives, Finance, ...). Used to group the directory by office.
 *
 * @param {*} officer - One officer record.
 * @returns {number} A smaller number means the office comes earlier; 99 means no known office.
 */
const officeIndex = (officer) => {
  const idx = getOfficerPositions(officer)
    .map((position) => OFFICE_ORDER.indexOf(String(position.office ?? "").trim()))
    .filter((officeIndexValue) => officeIndexValue >= 0);
  return idx.length ? Math.min(...idx) : 99;
};
/**
 * Sorts officers by office, then Director -> Assistant Director -> others, then name.
 *
 * @param {*} officerList - The officers to sort.
 * @returns {object[]} A new, sorted array (the original is not changed).
 */
const sortOfficers = (list) =>
  [...list].sort(
    (firstItem, secondItem) =>
      officeIndex(firstItem) - officeIndex(secondItem) ||
      rankIn(firstItem) - rankIn(secondItem) ||
      String(firstItem.name).localeCompare(String(secondItem.name)),
  );

/*
  Builds the Executive/Functional office organizational tree.
  Leadership roles are sorted by Director, Assistant/Deputy Director, and secretary rank.
*/
// ==========================================
// OFFICERS: ORGANIZATION TREE
// ==========================================
// Draws the Structure tab: the Executive Office on top (Director, Assistant Director,
// then other executives) with the functional offices and their officers beneath it.

function renderOfficerTree() {
  const tree = getElementById("officer-tree");
  if (!tree) return;

  // Only the selected academic year's assignments (current A.Y. by default).
  // Advisers have no year and always appear. Older assignments stay in the records.
  const selectedAcademicYear = academicYearSelection.selected;
  const published = officerRecords
    .filter((officer) => officer.status === "published")
    .map((officer) => ({
      ...officer,
      positions: getOfficerPositions(officer).filter(
        (position) => !position.year || position.year === selectedAcademicYear,
      ),
    }))
    .filter((officer) => officer.positions.length > 0);

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

  const programNames = Object.fromEntries(
    [...(getElementById("officer-program")?.options ?? [])]
      .filter((option) => option.value)
      .map((option) => [option.value, option.textContent.trim()]),
  );
  const initials = (name) =>
    String(name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");

  // Profile card: 1:1 photo (placeholder initials until uploads are connected), name, position, program, year.
  const card = (officer, role, lead = false) => {
    const hasPhoto = /^(https?:|data:|\/)/.test(String(officer.photo ?? ""));
    const photo = hasPhoto
      ? `<img src="${escapeHTML(officer.photo)}" alt="" loading="lazy">`
      : `<span>${escapeHTML(initials(officer.name))}</span>`;
    const detail = [
      programNames[officer.program] || officer.program,
      officer.yearLevel,
    ]
      .filter(Boolean)
      .join(" · ");
    return `
      <article class="op-card${lead ? " op-lead" : ""}">
        <div class="op-photo">${photo}</div>
        <div class="op-body">
          <span class="op-role">${escapeHTML(role || "Officer")}</span>
          <strong>${escapeHTML(officer.name)}</strong>
          <small>${escapeHTML(detail)}</small>
        </div>
      </article>`;
  };
  const vacantCard = (label) => `
    <article class="op-card op-vacant">
      <div class="op-photo"><span>?</span></div>
      <div class="op-body"><span class="op-role">${escapeHTML(label)}</span><strong>Position vacant</strong></div>
    </article>`;

  const advisers = published.filter(isOrgAdviser);
  const sbgl = published.filter((officer) =>
    hasRole(officer, "Student Builder Group Lead"),
  );
  const executiveDirectors = published.filter((officer) =>
    hasRole(officer, "Executive Director"),
  );
  const executiveTeam = published.filter(
    (officer) =>
      hasOffice(officer, "Executive") &&
      !isOrgAdviser(officer) &&
      !hasRole(officer, "Student Builder Group Lead") &&
      !hasRole(officer, "Executive Director"),
  );
  const executiveRank = (officer) => {
    const roles = positions(officer)
      .filter(
        (position) =>
          String(position.office ?? "")
            .trim()
            .toLowerCase() === "executive",
      )
      .map((position) => String(position.title ?? "").trim());
    if (roles.some((role) => /^(?:executive\s+)?director$/i.test(role)))
      return 0;
    if (
      roles.some((role) =>
        /assistant\s+director|deputy\s+director|asst\.?\s*director/i.test(role),
      )
    )
      return 1;
    if (
      roles.some((role) =>
        /executive\s+secretary|exec\s+secretary|secretary/i.test(role),
      )
    )
      return 2;
    if (roles.some((role) => /director/i.test(role))) return 3;
    return 4;
  };
  const offices = [
    "Creatives",
    "Finance",
    "Technology",
    "Relations",
    "Marketing",
    "Operations",
  ];

  const node = (key, title, count, body, emptyText, nested = false) => {
    const open = !closedOrgNodes.has(key);
    return `
    <div class="tn${open ? " is-open" : ""}" data-key="${key}">
      <button type="button" class="tn-head" aria-expanded="${open}">
        <i data-icon="chevron-right" class="tn-chev"></i>
        <span class="tn-title">${escapeHTML(title)}</span><em>${count}</em>
      </button>
      <div class="tn-wrap"><div class="tn-inner">
        <div class="tn-body${nested ? " nested" : ""}">${body || `<p class="org-empty">${escapeHTML(emptyText)}</p>`}</div>
      </div></div>
    </div>`;
  };

  const leadership = [
    ["Organizational Adviser", advisers],
    ["Student Builder Group Lead", sbgl],
    ["Executive Director", executiveDirectors],
  ];
  const leadershipCards = leadership
    .flatMap(([label, list]) =>
      list.length
        ? list.map((officer) => card(officer, label))
        : [vacantCard(label)],
    )
    .join("");
  const officeNodes = offices
    .map((office) => {
      const people = published.filter(
        (officer) => hasOffice(officer, office) && !isOrgAdviser(officer),
      );
      return node(
        `office-${office}`,
        office,
        people.length,
        [...people]
          .sort(byRank(office))
          .map((officer) =>
            card(
              officer,
              roleNames(officer, office),
              rankIn(officer, office) < 2,
            ),
          )
          .join(""),
        "No officers assigned for this academic year.",
      );
    })
    .join("");

  tree.innerHTML = `
    <div class="otree">
      <div class="otree-head">
        <div>
          <span class="org-eyebrow">AWS Student Builder Group - Colegio de Muntinlupa</span>
          <h3>${escapeHTML(formatAcademicYearLabel(selectedAcademicYear))} structure</h3>
        </div>
        <div class="otree-tools">
          <button type="button" class="button button-light" data-tree="expand">Expand all</button>
          <button type="button" class="button button-light" data-tree="collapse">Collapse all</button>
        </div>
      </div>
      <div class="otree-kids">
        ${node("leadership", "Leadership", leadership.filter(([, list]) => list.length).length + "/3 filled", leadershipCards, "")}
        ${node(
          "executive",
          "Executive Office",
          executiveTeam.length,
          [...executiveTeam]
            .sort(
              (firstItem, secondItem) =>
                executiveRank(firstItem) - executiveRank(secondItem) ||
                String(firstItem.name).localeCompare(String(secondItem.name)),
            )
            .map((officer) =>
              card(
                officer,
                roleNames(officer, "Executive") || "Executive Officer",
                rankIn(officer, "Executive") < 2,
              ),
            )
            .join(""),
          "No executive officers assigned for this academic year.",
        )}
        ${node("functional", "Functional Offices", `${offices.length} offices`, officeNodes, "", true)}
      </div>
    </div>`;

  const setNode = (treeNode, open) => {
    treeNode.classList.toggle("is-open", open);
    treeNode.querySelector(".tn-head").setAttribute("aria-expanded", String(open));
    open
      ? closedOrgNodes.delete(treeNode.dataset.key)
      : closedOrgNodes.add(treeNode.dataset.key);
  };
  tree.querySelectorAll(".tn-head").forEach((head) =>
    head.addEventListener("click", () => {
      const treeNode = head.closest(".tn");
      setNode(treeNode, !treeNode.classList.contains("is-open"));
    }),
  );
  tree
    .querySelector('[data-tree="expand"]')
    .addEventListener("click", () =>
      tree.querySelectorAll(".tn").forEach((treeNode) => setNode(treeNode, true)),
    );
  tree
    .querySelector('[data-tree="collapse"]')
    .addEventListener("click", () =>
      tree.querySelectorAll(".tn").forEach((treeNode) => setNode(treeNode, false)),
    );
}

/*
  Builds the Officers Directory table from loaded profiles and active filters.
  Edit and delete actions are wired after the table markup is generated.
*/
// ==========================================
// OFFICERS: DIRECTORY TABLE
// ==========================================
// Draws the Directory tab. It renders ALL matching officers; table-standard.js
// adds search, sorting, filters and paging on top.

function renderOfficers() {
  const list = getElementById("officer-list");
  const search = "";
  const statusFilter = "all";
  const yearFilter = "all";

  // Program codes (e.g. "CpE") shown as their full names from the form's dropdown.
  const programNames = Object.fromEntries(
    [...(getElementById("officer-program")?.options ?? [])]
      .filter((option) => option.value)
      .map((option) => [option.value, option.textContent.trim()]),
  );

  const filtered = sortOfficers(
    officerRecords.filter((officer) => {
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
    }),
  );
  // Paging is handled by table-standard.js, so every matching officer is rendered here.
  const pageItems = filtered;

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
            ${pageItems
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

/*
  Adds open/close, keyboard, option selection, and viewport positioning behavior
  to the reusable Officer dropdown component.
*/
// ==========================================
// CUSTOM DROPDOWNS IN THE OFFICER FORM
// ==========================================
// Replaces plain browser dropdowns with styled ones that follow the dashboard theme.

function setupOfficerDropdown(dropdown) {
  const trigger = dropdown.querySelector(".officer-select-trigger");
  const label = dropdown.querySelector(".officer-select-label");
  const menu = dropdown.querySelector(".officer-select-menu");
  const options = () => [
    ...dropdown.querySelectorAll(".officer-select-option"),
  ];

  if (!trigger || !label || !menu) return;
  menu._ownerDropdown = dropdown;
  menu._ownerTrigger = trigger;

  function positionDropdown() {
    if (menu.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const width = rect.width;
    const height = Math.min(menu.scrollHeight || 260, 260);
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
  }

  function closeDropdown() {
    menu.hidden = true;
    dropdown.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
    if (menu.parentElement !== dropdown) dropdown.append(menu);
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
      const otherDropdown = otherMenu._ownerDropdown;
      otherDropdown?.classList.remove("open");
      if (otherDropdown && otherMenu.parentElement !== otherDropdown)
        otherDropdown.append(otherMenu);
    });

    document
      .querySelectorAll(".officer-select-trigger")
      .forEach((otherTrigger) => {
        otherTrigger.setAttribute("aria-expanded", "false");
      });

    menu.hidden = !opening;
    dropdown.classList.toggle("open", opening);
    trigger.setAttribute("aria-expanded", String(opening));
    if (opening) {
      (dropdown.closest("dialog") || document.body).append(menu);
      positionDropdown();
    }
  });

  menu.addEventListener("click", (event) => {
    const option = event.target.closest(".officer-select-option");
    if (!option) return;

    selectOption(option);
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdown();
      trigger.focus({ preventScroll: true });
    }

    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      menu.hidden = false;
      dropdown.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      (dropdown.closest("dialog") || document.body).append(menu);
      positionDropdown();
      options()[0]?.focus({ preventScroll: true });
    }
  });

  menu.addEventListener("keydown", (event) => {
    const items = options();
    const currentIndex = items.indexOf(document.activeElement);

    if (event.key === "Escape") {
      closeDropdown();
      trigger.focus({ preventScroll: true });
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus({ preventScroll: true });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus({
        preventScroll: true,
      });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = document.activeElement.closest(".officer-select-option");
      if (option) selectOption(option);
    }
  });
}

document.querySelectorAll(".officer-select").forEach(setupOfficerDropdown);

window.addEventListener("resize", () => {
  document
    .querySelectorAll(".officer-select-menu:not([hidden])")
    .forEach((menu) => {
      const trigger = menu._ownerTrigger;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = rect.width;
      const height = Math.min(menu.scrollHeight || 260, 260);
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
    });
});
window.addEventListener(
  "scroll",
  () => {
    document
      .querySelectorAll(".officer-select-menu:not([hidden])")
      .forEach((menu) => {
        const dropdown = menu._ownerDropdown;
        const trigger = menu._ownerTrigger;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          menu.hidden = true;
          dropdown.classList.remove("open");
          trigger.setAttribute("aria-expanded", "false");
          dropdown.append(menu);
          return;
        }
        const width = rect.width;
        const height = Math.min(menu.scrollHeight || 260, 260);
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
      });
  },
  true,
);

// Convert Basic Information native select sources into the same custom dropdown
// component used by the Officers status filter, while keeping the original select
// in the form for validation and existing data handling.
/*
  Converts native Officer form selects into the shared custom dropdown pattern
  while retaining the original select for native form data and validation.
*/
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
  chevron.innerHTML = '<i data-icon="chevron-down"></i>';
  trigger.append(label, chevron);
  const menu = document.createElement("div");
  menu.className = "officer-select-menu";
  menu.hidden = true;
  menu._ownerDropdown = dropdown;
  menu._ownerTrigger = trigger;
  menu.setAttribute("role", "listbox");
  menu.setAttribute(
    "aria-label",
    select.labels?.[0]?.textContent || select.name,
  );
  [...select.options].forEach((optionElement) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "officer-select-option";
    item.dataset.value = optionElement.value;
    item.setAttribute("role", "option");
    const text = document.createElement("span");
    text.textContent = optionElement.textContent;
    const check = document.createElement("span");
    check.className = "option-check";
    check.innerHTML = '<i data-icon="check"></i>';
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
        (optionElement) => optionElement.dataset.value === value,
      ) || menu.querySelector(".officer-select-option");
    menu.querySelectorAll(".officer-select-option").forEach((optionElement) => {
      const chosen = optionElement === option;
      optionElement.classList.toggle("selected", chosen);
      optionElement.setAttribute("aria-selected", String(chosen));
    });
    label.textContent =
      option?.querySelector("span")?.textContent || "Select an option";
  }
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const opening = menu.hidden;
    document
      .querySelectorAll(".officer-select-menu")
      .forEach((menuElement) => (menuElement.hidden = true));
    document
      .querySelectorAll(".officer-select-trigger")
      .forEach((triggerElement) => triggerElement.setAttribute("aria-expanded", "false"));
    menu.hidden = !opening;
    trigger.setAttribute("aria-expanded", String(opening));
    if (opening) {
      (dropdown.closest("dialog") || document.body).append(menu);
      positionBasicMenu();
    }
  });
  menu.addEventListener("click", (event) => {
    const option = event.target.closest(".officer-select-option");
    if (!option) return;
    select.value = option.dataset.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    sync(select.value);
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    dropdown.append(menu);
    trigger.focus({ preventScroll: true });
  });
  select.addEventListener("change", () => sync(select.value));
  sync();
  select._customDropdownSync = sync;

  function positionBasicMenu() {
    if (menu.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const width = rect.width;
    const height = Math.min(menu.scrollHeight || 240, 240);
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 8)
      top = Math.max(8, rect.top - height - 8);
    menu.style.position = "fixed";
    menu.style.zIndex = "10050";
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.left))}px`;
    menu.style.top = `${top}px`;
  }

  trigger.addEventListener("keydown", (event) => {
    const items = [...menu.querySelectorAll(".officer-select-option")];
    if (event.key === "Escape") {
      event.preventDefault();
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      dropdown.append(menu);
      trigger.focus({ preventScroll: true });
    } else if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      (dropdown.closest("dialog") || document.body).append(menu);
      positionBasicMenu();
      items[0]?.focus({ preventScroll: true });
    }
  });
  menu.addEventListener("keydown", (event) => {
    const items = [...menu.querySelectorAll(".officer-select-option")];
    const index = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      dropdown.append(menu);
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
}

/**
 * Refreshes the styled program and year-level dropdowns after the form values were changed by code.
 */
function syncOfficerFormSelects() {
  [getElementById("officer-program"), getElementById("officer-year-level")].forEach((select) => {
    select?._customDropdownSync?.();
  });
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".officer-select")) {
    document.querySelectorAll(".officer-select-menu").forEach((menu) => {
      menu.hidden = true;
      const dropdown = menu._ownerDropdown;
      dropdown?.classList.remove("open");
      if (dropdown && menu.parentElement !== dropdown) dropdown.append(menu);
    });

    document.querySelectorAll(".officer-select-trigger").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
  }
});


// ==========================================
// OFFICER FORM DIALOG
// ==========================================
// Opening, closing and filling the dialog used to add or edit one officer.

let officerPhotoFile = null;
let officerPhotoObjectUrl = null;

/* ========================================
   OFFICER MODAL: FOCUS AND SCROLL CONTROL
======================================== */

let officerModalReturnFocus = null;

/*
  Opens the Add/Edit Officer modal and restores existing values when editing.
  It initializes position rows and keeps modal focus in the form.
*/
function openOfficerModal(officer = null) {
  const modal = getElementById("officer-form-panel");
  const form = getElementById("officer-form");

  // Remember the element that opened the modal.
  officerModalReturnFocus = document.activeElement;

  // Reset the form for a new officer.
  form.reset();
  getElementById("officer-id").value = "";
  getElementById("officer-positions-list").replaceChildren();

  // Clear the custom birthdate value and display.
  getElementById("officer-birthdate").value = "";
  getElementById("officer-birthdate-display").textContent = "Choose a birthdate";

  officerBirthdatePicker.reset();

  // Reset optional photo selection; intentionally no image preview.
  officerPhotoFile = null;
  getElementById("officer-photo-file").value = "";
  getElementById("officer-photo-file").dataset.existingPhoto = "";
  getElementById("officer-photo-filename").textContent = "No photo selected";
  getElementById("officer-photo-remove").hidden = true;

  if (officer) {
    // Populate these fields when editing an existing officer.
    getElementById("officer-id").value = officer.officerId ?? officer.id ?? "";
    getElementById("officer-name").value = officer.name ?? "";
    getElementById("officer-program").value = officer.program ?? "";
    getElementById("officer-student-number").value = officer.studentNumber ?? "";
    getElementById("officer-year-level").value = officer.yearLevel ?? "";
    getElementById("officer-cdm-email").value = officer.cdmEmail ?? "";
    getElementById("officer-personal-email").value = officer.personalEmail ?? "";
    getElementById("officer-contact").value = officer.contactNumber ?? "";

    const birthdate = String(officer.birthdate ?? "");
    const isoBirthdate = birthdate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      ? birthdate
      : birthdate.match(/^(\d{2})-(\d{2})-(\d{4})$/)
        ? `${birthdate.slice(6, 10)}-${birthdate.slice(0, 2)}-${birthdate.slice(3, 5)}`
        : "";
    getElementById("officer-birthdate").value = isoBirthdate;
    getElementById("officer-birthdate-display").textContent =
      formatOfficerBirthdate(isoBirthdate);

    const positions = Array.isArray(officer.positions) ? officer.positions : [];

    positions.forEach((position) => addOfficerPositionRow(position));

    getElementById("officer-form-heading").textContent = "Edit officer";
    getElementById("officer-publish").textContent = "Update and Publish";
  } else {
    getElementById("officer-form-heading").textContent = "Add officer";
    getElementById("officer-publish").textContent = "Publish Officer";
    addOfficerPositionRow();
  }

  // Clear stale browser validation messages.
  [
    getElementById("officer-birthdate"),
    getElementById("officer-contact"),
    getElementById("officer-cdm-email"),
  ].forEach((input) => input.setCustomValidity(""));

  syncOfficerFormSelects();
  if (!modal.open) {
    modal.showModal();
  }

  document.body.classList.add("officer-modal-open");
  getElementById("officer-name").focus();
}

/**
 * Closes the officer dialog with a short exit animation.
 */
function closeOfficerModal() {
  const modal = getElementById("officer-form-panel");

  if (modal.open) {
    modal.close();
  }
}

/**
 * Cleans up after the officer dialog closes: re-enables page scrolling, frees the
 * photo preview from memory, and returns keyboard focus to the button that opened it.
 */
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

const officerModal = getElementById("officer-form-panel");

getElementById("officer-form-cancel").addEventListener("click", closeOfficerModal);
getElementById("officer-modal-close").addEventListener("click", closeOfficerModal);

officerModal.addEventListener("close", restoreOfficerModalFocus);

/* ========================================
   OFFICER FORM VALIDATION
======================================== */

const officerBirthdatePicker = bindBirthdatePicker(getElementById("officer-birthdate-trigger").closest(".birthdate-picker-wrap"));
const formatOfficerBirthdate = formatBirthdate;

// Photo selection only. No image preview is shown; persistent upload storage is separate.
getElementById("officer-photo-file").addEventListener("change", () => {
  const file = getElementById("officer-photo-file").files?.[0];
  const filename = getElementById("officer-photo-filename");
  const removeButton = getElementById("officer-photo-remove");
  if (!file) {
    filename.textContent = "No photo selected";
    removeButton.hidden = true;
    officerPhotoFile = null;
    return;
  }
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    showNotice("Choose a JPG, PNG, or WebP image file.", "error");
    getElementById("officer-photo-file").value = "";
    filename.textContent = "No photo selected";
    officerPhotoFile = null;
    removeButton.hidden = true;
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showNotice("The photo must be 5 MB or smaller.", "error");
    getElementById("officer-photo-file").value = "";
    filename.textContent = "No photo selected";
    officerPhotoFile = null;
    removeButton.hidden = true;
    return;
  }
  officerPhotoFile = file;
  filename.textContent = file.name;
  removeButton.hidden = false;
});

getElementById("officer-photo-remove").addEventListener("click", () => {
  officerPhotoFile = null;
  getElementById("officer-photo-file").value = "";
  getElementById("officer-photo-file").dataset.existingPhoto = "";
  getElementById("officer-photo-filename").textContent = "No photo selected";
  getElementById("officer-photo-remove").hidden = true;
});

getElementById("new-officer-button").addEventListener("click", () => {
  openOfficerModal();
});

/**
 * Adds one row to the officer form where a title, office and academic year are entered
 * (an officer can hold several positions).
 *
 * @param {*} position - Optional values used to pre-fill the row when editing.
 */
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
      chevron.innerHTML = '<i data-icon="chevron-down"></i>';
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
        check.innerHTML = '<i data-icon="check"></i>';
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
  getElementById("officer-positions-list").appendChild(row);
}

getElementById("add-officer-position").addEventListener("click", (event) => {
  event.preventDefault();
  addOfficerPositionRow();
});

// Officer CRUD: the Lambda already supports POST, PUT and DELETE.
getElementById("officer-list").addEventListener("click", async (event) => {
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
    await apiRequest(`${OFFICERS_API_BASE_URL}/${encodeURIComponent(officerId)}`, {
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

getElementById("officer-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const action = event.submitter?.value;

  if (action !== "draft" && action !== "published") {
    showNotice("Please choose Save as Draft or Publish Officer.", "error");
    return;
  }

  const form = getElementById("officer-form");

  // Read the dynamically generated position rows.
  const positionRows = [
    ...getElementById("officer-positions-list").querySelectorAll(".officer-position-row"),
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
    getElementById("officer-program"),
    getElementById("officer-student-number"),
    getElementById("officer-year-level"),
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
    name: getElementById("officer-name").value.trim(),
    program: getElementById("officer-program").value,
    studentNumber: getElementById("officer-student-number").value.trim(),
    yearLevel: getElementById("officer-year-level").value,
    academicYear,
    cdmEmail: getElementById("officer-cdm-email").value.trim(),
    personalEmail: getElementById("officer-personal-email").value.trim(),
    contactNumber: getElementById("officer-contact").value.trim(),
    birthdate: getElementById("officer-birthdate").value,
    photo: getElementById("officer-photo-file").dataset.existingPhoto || "",
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

  const officerId = getElementById("officer-id").value;
  const buttons = [getElementById("officer-save-draft"), getElementById("officer-publish")];
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
      ? `${OFFICERS_API_BASE_URL}/${encodeURIComponent(officerId)}`
      : OFFICERS_API_BASE_URL;

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
enhanceOfficerFormSelect(getElementById("officer-program"));
enhanceOfficerFormSelect(getElementById("officer-year-level"));

getElementById("cancel-button").addEventListener("click", discardEventForm);
getElementById("refresh-button").addEventListener("click", loadEvents);
getElementById("profile-refresh").addEventListener("click", async () => {
  getElementById("profile-menu").hidden = true;
  getElementById("profile-button").setAttribute("aria-expanded", "false");
  await loadEvents();
});


function positionSidebarProfileMenu() {
  const button = getElementById("profile-button");
  const menu = getElementById("profile-menu");
  if (!button || !menu || menu.hidden) return;

  const buttonRect = button.getBoundingClientRect();
  const menuWidth = Math.min(250, window.innerWidth - 24);
  const menuHeight = Math.min(menu.scrollHeight || 180, window.innerHeight - 24);
  const sidebarRect = getElementById("sidebar").getBoundingClientRect();
  const left = Math.min(window.innerWidth - menuWidth - 12, sidebarRect.right + 10);
  const top = Math.max(12, Math.min(window.innerHeight - menuHeight - 12, buttonRect.bottom - menuHeight));
  menu.style.position = "fixed";
  menu.style.left = `${Math.max(12, left)}px`;
  menu.style.top = `${top}px`;
  menu.style.right = "auto";
  menu.style.bottom = "auto";
  menu.style.width = `${menuWidth}px`;
}

getElementById("profile-button").addEventListener("click", () => {
  const menu = getElementById("profile-menu");
  menu.hidden = !menu.hidden;
  getElementById("profile-button").setAttribute("aria-expanded", String(!menu.hidden));
  if (!menu.hidden) requestAnimationFrame(positionSidebarProfileMenu);
});

window.addEventListener("resize", positionSidebarProfileMenu);
window.addEventListener("scroll", positionSidebarProfileMenu, true);

document.addEventListener("click", (event) => {
  if (!event.target.closest(".profile-wrap")) {
    getElementById("profile-menu").hidden = true;
    getElementById("profile-button").setAttribute("aria-expanded", "false");
  }
});

getElementById("event-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateOptionalTimeRange()) {
    return;
  }
  // Prevent native validation from trying to focus controls
  // inside the hidden custom time picker.
  if (!getElementById("event-form").checkValidity()) {
    getElementById("event-form").reportValidity();
    return;
  }

  const eventId = getElementById("event-id").value;

  // Determine which submit button was clicked.
  const action = event.submitter?.value;

  if (action !== "draft" && action !== "published") {
    showNotice("Please choose Save as Draft or Publish Event.", "error");
    return;
  }

  const payload = {
    title: getElementById("title").value.trim(),
    date: getElementById("date").value,
    time: getElementById("time").value,
    location: getElementById("location").value.trim(),
    status: action,
  };

  // Validate required fields before saving.
  if (!payload.title || !payload.date || !payload.location) {
    showNotice("Please complete the event title, date, and location.", "error");
    return;
  }

  const draftButton = getElementById("save-draft-button");
  const publishButton = getElementById("publish-button");

  draftButton.disabled = true;
  publishButton.disabled = true;

  try {
    if (eventId) {
      await apiRequest(`${EVENTS_API_BASE_URL}/${encodeURIComponent(eventId)}`, {
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
      await apiRequest(EVENTS_API_BASE_URL, {
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

getElementById("logout-button").addEventListener("click", async () => {
  const logoutButton = getElementById("logout-button");

  try {
    logoutButton.disabled = true;
    logoutButton.textContent = "Signing out...";

    await signOut();

    // Return to the admin login page after signing out.
    window.location.replace("/admin/");
  } catch (error) {
    console.error("Sign-out failed:", error);

    showNotice("Unable to sign out. Please try again.", "error");

    logoutButton.disabled = false;
    logoutButton.textContent = "Sign out";
  }
});

/**
 * Checks the optional start/end times of the event form.
 * Both may be empty; if only one is given, or the end is before the start, an error is shown.
 *
 * @returns {boolean} True when the times are acceptable.
 */
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

// ==========================================
// AUTHENTICATION AND ADMIN ACCESS CHECK
// ==========================================
// The Cognito sign-in itself happens on the admin login page. This file only
// READS the existing session and decides whether this visitor may see the
// dashboard. Nothing here changes any Cognito or backend setting.

// The Cognito group whose members are allowed to use the dashboard.
const COGNITO_ADMIN_GROUP_NAME = "Admins";
// Where visitors without a valid session are sent (the admin login page).
const ADMIN_LOGIN_PAGE_PATH = "/admin/";
// Where signed-in users who are NOT administrators are sent.
const ACCESS_DENIED_PAGE_PATH = "/admin/?error=access-denied";

/**
 * Reads the current Cognito session and checks whether the user is an administrator.
 *
 * It only answers the question "may this person enter?" - it does not load any
 * dashboard data. That separation matters: an error while loading data must never
 * be treated as a failed login.
 *
 * @returns {Promise<{status: "authorized"|"unauthenticated"|"forbidden",
 *   authenticatedUser?: object, idTokenValue?: object, tokenPayload?: object}>}
 *   "unauthenticated" = no valid session, "forbidden" = signed in but not in Admins.
 * @throws If Cognito cannot be reached or the session cannot be read.
 */
async function validateAuthenticatedUserSession() {
  // Ask Cognito (through the shared amplify.js helper) who is signed in.
  const authenticatedUser = await getCurrentUser();
  const authenticationSession = await fetchAuthSession();
  const idTokenValue = authenticationSession.tokens?.idToken;

  // No signed-in user, or no ID token: the visitor is not logged in.
  if (!authenticatedUser || !idTokenValue) {
    return { status: "unauthenticated" };
  }

  // The ID token lists the user's groups in the "cognito:groups" claim.
  const tokenPayload = idTokenValue.payload ?? {};
  const userGroups = tokenPayload["cognito:groups"] ?? [];

  // Only members of the Admins group may enter. This stops regular users
  // from opening administrator-only pages.
  const hasAdminPrivileges =
    Array.isArray(userGroups) && userGroups.includes(COGNITO_ADMIN_GROUP_NAME);

  if (!hasAdminPrivileges) {
    return { status: "forbidden" };
  }

  return { status: "authorized", authenticatedUser, idTokenValue, tokenPayload };
}

/**
 * Prepares the dashboard for an administrator whose session has been verified:
 * stores the token for API calls, fills in the profile menu, reveals the page,
 * and loads the events and officers.
 *
 * @param {object} verifiedSession - The "authorized" result from validateAuthenticatedUserSession().
 */
async function initializeDashboardForAdministrator(verifiedSession) {
  const { authenticatedUser, idTokenValue, tokenPayload } = verifiedSession;

  // Keep the ID token so later API requests can prove who is calling.
  idToken = idTokenValue.toString();

  // Show the administrator's name and email in the top-right profile menu.
  setProfile({
    profile: {
      name: tokenPayload.name || tokenPayload.nickname || "",
      email: tokenPayload.email || "",
      preferred_username: tokenPayload.preferred_username || "",
      username: authenticatedUser.username || "",
    },
  });

  // Reveal the dashboard only after authorization has succeeded.
  document.querySelector(".app").hidden = false;

  // Load both data sets at the same time. allSettled lets one list fail
  // (for example a temporary network problem) without blocking the other.
  await Promise.allSettled([loadEvents(), loadOfficers()]);

  // Open the page named in the address bar (for example "#members"), or the
  // Overview by default. dashboard-shell.js keeps the address bar up to date.
  const requestedViewName = window.location.hash.replace(/^#\/?/, "");
  showWorkspace(VIEWS[requestedViewName] ? requestedViewName : "overview");
}

/**
 * Entry point of the dashboard. It first verifies the session, then starts the page.
 *
 * Why two separate try/catch blocks? Previously ONE try/catch covered both the
 * login check and the page start-up. Any unrelated programming error during
 * start-up (for example a missing HTML element) was therefore reported as
 * "session failed" and sent a valid administrator back to the login page.
 * Now only real session problems redirect; start-up errors are shown on screen.
 */
async function startDashboard() {
  let sessionCheck;

  try {
    sessionCheck = await validateAuthenticatedUserSession();
  } catch (error) {
    console.error("Unable to verify the Cognito administrator session:", error);
    // The session itself could not be checked, so return to the login page.
    window.location.replace(ADMIN_LOGIN_PAGE_PATH);
    return;
  }

  if (sessionCheck.status === "unauthenticated") {
    window.location.replace(ADMIN_LOGIN_PAGE_PATH);
    return;
  }

  if (sessionCheck.status === "forbidden") {
    console.warn("Dashboard access denied: user is not an administrator.");
    try {
      // End the session so the non-admin account is not left signed in.
      await signOut();
    } finally {
      window.location.replace(ACCESS_DENIED_PAGE_PATH);
    }
    return;
  }

  // From here on the user IS a verified administrator, so a failure below is a
  // dashboard bug, not an authentication problem: report it, but do not redirect.
  try {
    await initializeDashboardForAdministrator(sessionCheck);
  } catch (error) {
    console.error("The dashboard could not finish loading:", error);
    document.querySelector(".app").hidden = false;
    showNotice(
      "Part of the dashboard could not load. Please refresh the page.",
      "error",
    );
  }
}

await startDashboard();
