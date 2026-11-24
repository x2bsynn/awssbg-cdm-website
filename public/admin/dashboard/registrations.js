/*
  Event registration module.
  Uses browser localStorage sample registrants and form settings.
  Provides registration summaries, form configuration, CSV export, and modal UI.
  Used by dashboard-shell.js for Overview and reports.js for analytics.
*/
import { openModalDialog, askForConfirmation, getMembers, ACADEMIC_PROGRAMS } from "./members.js";
import { getTodayInManila } from "./ay.js";
import { escapeHtml, formatDate, showToastMessage } from "./utilities.js";

// Browser storage key for the demonstration registrants and form settings.
const REGISTRATIONS_STORAGE_KEY = "sbg-regs-sample-v1";
// The three possible statuses of a registration.
const REGISTRATION_STATUS_NAMES = ["Confirmed", "Pending", "Cancelled"];
const YEAR_LEVEL_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
// ==========================================
// SAVED SAMPLE DATA
// ==========================================
// Registrants and form settings are generated for demonstration and saved in this
// browser only, because the events service does not store them yet.

let registrationDatabase = (() => {
  try {
    const savedRegistrationData = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY));
    if (savedRegistrationData?.regs && savedRegistrationData?.config) return savedRegistrationData;
  } catch {
    /* start fresh */
  }
  return { regs: {}, config: {} };
})();
/**
 * Saves registrants and registration form settings in this browser (localStorage).
 */
const saveRegistrationDatabase = () => {
  try {
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(registrationDatabase));
  } catch {
    /* storage unavailable */
  }
};

const STANDARD_REGISTRATION_FIELDS = [
  { key: "name", label: "Full name", type: "text", required: true },
  {
    key: "studentNumber",
    label: "Student number",
    type: "text",
    required: true,
  },
  { key: "program", label: "Academic program", type: "select", required: true },
  { key: "yearLevel", label: "Year level", type: "select", required: true },
  { key: "email", label: "Email address", type: "email", required: true },
  { key: "contact", label: "Contact number", type: "text", required: false },
];
/**
 * Returns the registration settings of one event (open/closed, deadline, form fields), creating default settings the first time.
 *
 * @param {*} eventRecord - One event from the events service.
 * @returns {object} The settings object (changes to it can be saved with saveRegistrationDatabase()).
 */
const getEventRegistrationConfiguration = (eventRecord) =>
  (registrationDatabase.config[eventRecord.eventId] ??= {
    open: true,
    deadline: "",
    fields: STANDARD_REGISTRATION_FIELDS.map((standardField) => ({ ...standardField })),
  });
/**
 * Tells whether people can still register: registration must be switched on AND the deadline must not have passed.
 *
 * @param {*} registrationConfiguration - The event's registration settings.
 * @returns {"Open"|"Closed"} The current state.
 */
const getRegistrationState = (registrationConfiguration) =>
  registrationConfiguration.open && (!registrationConfiguration.deadline || getTodayInManila() <= registrationConfiguration.deadline) ? "Open" : "Closed";
/**
 * Describes where an event is in time: Draft, Upcoming, Ongoing (today) or Completed.
 *
 * @param {*} eventRecord - One event.
 * @returns {string} The phase name.
 */
const getEventPhase = (eventRecord) =>
  eventRecord.status !== "published"
    ? "Draft"
    : eventRecord.date > getTodayInManila()
      ? "Upcoming"
      : eventRecord.date === getTodayInManila()
        ? "Ongoing"
        : "Completed";

/*
  Reads registrants belonging to one event and its saved local configuration.
*/
function getEventRegistrations(eventRecord) {
  const eventIdText = String(eventRecord.eventId);
  if (registrationDatabase.regs[eventIdText]) return registrationDatabase.regs[eventIdText];
  if (eventRecord.status !== "published") return [];
  let seed = [...eventIdText].reduce((hashSoFar, character) => (hashSoFar * 31 + character.charCodeAt(0)) >>> 0, 7);
  const getNextRandomNumber = () =>
    (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pool = [...getMembers()].sort(() => getNextRandomNumber() - 0.5),
    registrantCount = 6 + Math.floor(getNextRandomNumber() * Math.min(24, pool.length - 6));
  registrationDatabase.regs[eventIdText] = pool.slice(0, registrantCount).map((member, registrantIndex) => {
    const statusRandomValue = getNextRandomNumber(),
      registrationDate = new Date(`${eventRecord.date}T12:00:00`);
    registrationDate.setDate(registrationDate.getDate() - 1 - Math.floor(getNextRandomNumber() * 14));
    return {
      id: `${eventIdText}-${registrantIndex}`,
      name: member.name,
      studentNumber: member.studentNumber,
      program: member.program,
      yearLevel: member.yearLevel,
      email: member.cdmEmail,
      contact: "",
      status: statusRandomValue < 0.6 ? "Confirmed" : statusRandomValue < 0.85 ? "Pending" : "Cancelled",
      date: registrationDate.toISOString().slice(0, 10),
      answers: {},
    };
  });
  saveRegistrationDatabase();
  return registrationDatabase.regs[eventIdText];
}

/*
  Aggregates registration totals and participation metrics for reports/Overview.
*/
export function getRegistrationStatistics(events) {
  const publishedEvents = events.filter((eventRecord) => eventRecord.status === "published");
  const allRegistrations = publishedEvents.flatMap((eventRecord) => getEventRegistrations(eventRecord).map((registration) => ({ ...registration, ev: eventRecord })));
  const confirmedRegistrations = allRegistrations.filter((registration) => registration.status === "Confirmed"),
    confirmedCountByStudent = {};
  confirmedRegistrations.forEach((registration) => {
    confirmedCountByStudent[registration.studentNumber] = (confirmedCountByStudent[registration.studentNumber] ?? 0) + 1;
  });
  const perEvent = publishedEvents
    .map((eventRecord) => ({
      title: eventRecord.title,
      confirmedCount: getEventRegistrations(eventRecord).filter((registration) => registration.status === "Confirmed").length,
      total: getEventRegistrations(eventRecord).length,
    }))
    .sort((firstEvent, secondEvent) => secondEvent.confirmedCount - firstEvent.confirmedCount);
  return {
    total: allRegistrations.length,
    confirmed: confirmedRegistrations.length,
    pending: allRegistrations.filter((registration) => registration.status === "Pending").length,
    cancelled: allRegistrations.filter((registration) => registration.status === "Cancelled").length,
    averagePerEvent: publishedEvents.length ? allRegistrations.length / publishedEvents.length : 0,
    uniqueParticipants: Object.keys(confirmedCountByStudent).length,
    multiEventParticipants: Object.values(confirmedCountByStudent).filter((confirmedCount) => confirmedCount > 1).length,
    averageEventsPerParticipant: Object.keys(confirmedCountByStudent).length
      ? confirmedRegistrations.length / Object.keys(confirmedCountByStudent).length
      : 0,
    mostParticipatedEvent: perEvent[0]?.confirmedCount ? perEvent[0] : null,
    perEvent,
  };
}
/**
 * Lists the newest registrations for the Overview activity feed.
 *
 * @param {*} eventRecords - Events to look through.
 * @param {*} maximumItems - How many items to return.
 * @returns {object[]} Items with a date and a sentence such as "Ana registered for X (Confirmed)".
 */
export const getRecentRegistrations = (events, maximumItems = 6) => {
  const todayDate = getTodayInManila();
  return events
    .filter((eventRecord) => eventRecord.status === "published")
    .flatMap((eventRecord) =>
      getEventRegistrations(eventRecord)
        .filter((registration) => registration.date <= todayDate)
        .map((registration) => ({
          date: registration.date,
          text: `${registration.name} registered for ${eventRecord.title} (${registration.status})`,
        })),
    )
    .sort((firstActivity, secondActivity) => secondActivity.date.localeCompare(firstActivity.date))
    .slice(0, maximumItems);
};

/*
  Opens the event registration dialog with tabs for registrants and form fields.
  It also handles registration status, deadline, CSV, and form preview actions.
*/
function openEvent(eventRecord) {
  const registrationConfiguration = getEventRegistrationConfiguration(eventRecord),
    dialogState = { q: "", status: "", tab: "regs", preview: false };
  const regs = () => getEventRegistrations(eventRecord);
  const eventDialog = openModalDialog(
    `<div class="m-head"><div><h3>${escapeHtml(eventRecord.title)}</h3><small>${formatDate(eventRecord.date)}${eventRecord.time ? " · " + escapeHtml(eventRecord.time) : ""} · ${escapeHtml(eventRecord.location)} · <span class="ms">${getEventPhase(eventRecord)}</span></small></div></div>
    <p class="sample-line"><span class="sample-tag">Sample data</span>Registrants and form settings are saved in this browser only.</p>
    <div class="rg-sum" id="rg-sum"></div>
    <div class="rg-ctl"><button class="button button-light" id="rg-toggle"></button><span class="ms" id="rg-state"></span>
      <label>Registration deadline <input type="date" id="rg-deadline" value="${escapeHtml(registrationConfiguration.deadline)}"></label></div>
    <div class="seg"><button type="button" data-tab="regs">Registrants</button><button type="button" data-tab="form">Registration form</button></div>
    <div id="rg-pane"></div><div class="mact"><button class="button button-light" data-a="close">Close</button></div>`,
    "mevent",
  );
  const findDialogElement = (selector) => eventDialog.querySelector(selector);
  const optsOf = (formField) =>
    formField.key === "program"
      ? Object.values(ACADEMIC_PROGRAMS)
      : formField.key === "yearLevel"
        ? YEAR_LEVEL_OPTIONS
        : (formField.options || "")
            .split(",")
            .map((choiceText) => choiceText.trim())
            .filter(Boolean);

  const drawTop = () => {
    const registrations = regs(),
      countWithStatus = (statusName) => registrations.filter((registration) => registration.status === statusName).length;
    findDialogElement("#rg-sum").innerHTML = [
      ["Total", registrations.length],
      ["Confirmed", countWithStatus("Confirmed")],
      ["Pending", countWithStatus("Pending")],
      ["Cancelled", countWithStatus("Cancelled")],
    ]
      .map(([summaryLabel, summaryValue]) => `<div><b>${summaryValue}</b><span>${summaryLabel}</span></div>`)
      .join("");
    findDialogElement("#rg-toggle").textContent = registrationConfiguration.open
      ? "Close registration"
      : "Open registration";
    findDialogElement("#rg-state").textContent = `Registration ${getRegistrationState(registrationConfiguration)}`;
    eventDialog.querySelectorAll("[data-tab]").forEach((tabButton) =>
      tabButton.setAttribute("aria-pressed", String(tabButton.dataset.tab === dialogState.tab)),
    );
  };
  const drawBody = () => {
    const searchText = dialogState.q.toLowerCase(),
      list = regs().filter(
        (registration) =>
          (!dialogState.status || registration.status === dialogState.status) &&
          (!searchText ||
            [registration.name, registration.studentNumber, registration.email].some((searchableValue) =>
              String(searchableValue).toLowerCase().includes(searchText),
            )),
      );
    findDialogElement("#rg-body").innerHTML =
      list
        .map(
          (
            registration,
          ) => `<tr><td><strong>${escapeHtml(registration.name)}</strong><small class="mono-s">${escapeHtml(registration.studentNumber)}</small></td><td>${escapeHtml(registration.program)} · ${escapeHtml(registration.yearLevel)}</td><td>${escapeHtml(registration.email)}</td><td>${formatDate(registration.date)}</td>
      <td><select data-rid="${escapeHtml(registration.id)}">${REGISTRATION_STATUS_NAMES.map((statusName) => `<option${statusName === registration.status ? " selected" : ""}>${statusName}</option>`).join("")}</select></td></tr>`,
        )
        .join("") ||
      `<tr><td colspan="5" class="empty-cell">${regs().length ? "No registrants match." : eventRecord.status === "published" ? "No registrations yet." : "Publish this event to accept registrations."}</td></tr>`;
  };
  const drawPane = () => {
    drawTop();
    if (dialogState.tab === "regs") {
      findDialogElement("#rg-pane").innerHTML =
        `<div class="m-tools"><input id="rg-q" class="search" type="search" placeholder="Search name, student number, email" value="${escapeHtml(dialogState.q)}">
        <select id="rg-st"><option value="">All statuses</option>${REGISTRATION_STATUS_NAMES.map((statusName) => `<option${statusName === dialogState.status ? " selected" : ""}>${statusName}</option>`).join("")}</select><button class="button button-light" data-a="export">Export CSV</button></div>
        <div class="table-wrap"><table class="m-table"><thead><tr><th>Participant</th><th>Program</th><th>Email</th><th>Registered</th><th>Status</th></tr></thead><tbody id="rg-body"></tbody></table></div>`;
      drawBody();
    } else {
      findDialogElement("#rg-pane").innerHTML =
        `<p class="empty-line">Choose what this event collects. Full name is always required.</p>
        <ul class="fb">${registrationConfiguration.fields
          .map(
            (
              formField,
              fieldIndex,
            ) => `<li><span><strong>${escapeHtml(formField.label)}</strong><small>${formField.type}${formField.options ? " · " + escapeHtml(formField.options) : ""}</small></span>
          <label><input type="checkbox" data-req="${fieldIndex}"${formField.required ? " checked" : ""}${formField.key === "name" ? " disabled" : ""}> Required</label>
          ${formField.key === "name" ? "<span></span>" : `<button class="button button-light" data-rm="${fieldIndex}">Remove</button>`}</li>`,
          )
          .join("")}</ul>
        <div class="fb-add"><input id="fb-label" placeholder="New question, e.g. T-shirt size"><select id="fb-type"><option value="text">Short text</option><option value="textarea">Long text</option><option value="number">Number</option><option value="select">Choice</option></select>
        <input id="fb-opts" placeholder="Choices, comma-separated"><button class="button button-primary" data-a="addfield">Add field</button></div>
        <div class="mact" style="justify-content:flex-start"><button class="button button-light" data-a="preview">${dialogState.preview ? "Hide" : "Preview"} form</button><button class="button button-light" data-a="reset">Reset to standard</button></div>
        ${
          dialogState.preview
            ? `<div class="fb-prev">${registrationConfiguration.fields
                .map(
                  (formField) =>
                    `<label>${escapeHtml(formField.label)}${formField.required ? " *" : ""}${
                      formField.type === "textarea"
                        ? "<textarea disabled></textarea>"
                        : formField.type === "select"
                          ? `<select disabled>${optsOf(formField)
                              .map((choiceText) => `<option>${escapeHtml(choiceText)}</option>`)
                              .join("")}</select>`
                          : `<input type="${formField.type === "number" ? "number" : formField.type === "email" ? "email" : "text"}" disabled>`
                    }</label>`,
                )
                .join("")}</div>`
            : ""
        }`;
    }
  };

  eventDialog.addEventListener("click", async (clickEvent) => {
    const clickedButton = clickEvent.target.closest("button");
    if (!clickedButton) return;
    if (clickedButton.dataset.tab) {
      dialogState.tab = clickedButton.dataset.tab;
      drawPane();
    } else if (clickedButton.id === "rg-toggle") {
      registrationConfiguration.open = !registrationConfiguration.open;
      saveRegistrationDatabase();
      drawTop();
      showToastMessage(`Registration ${registrationConfiguration.open ? "opened" : "closed"}.`);
    } else if (clickedButton.dataset.a === "close") eventDialog.close();
    else if (clickedButton.dataset.a === "preview") {
      dialogState.preview = !dialogState.preview;
      drawPane();
    } else if (clickedButton.dataset.a === "export") {
      const quoteCsvCell = (cellValue) => `"${String(cellValue ?? "").replace(/"/g, '""')}"`,
        extra = registrationConfiguration.fields.filter((formField) => !STANDARD_REGISTRATION_FIELDS.some((standardField) => standardField.key === formField.key));
      const rows = [
        [
          "Name",
          "Student number",
          "Program",
          "Year level",
          "Email",
          "Registered",
          "Status",
          ...extra.map((formField) => formField.label),
        ],
        ...regs().map((registration) => [
          registration.name,
          registration.studentNumber,
          registration.program,
          registration.yearLevel,
          registration.email,
          registration.date,
          registration.status,
          ...extra.map((formField) => registration.answers?.[formField.key] ?? ""),
        ]),
      ];
      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(
        new Blob(
          ["\ufeff" + rows.map((csvRow) => csvRow.map(quoteCsvCell).join(",")).join("\r\n")],
          { type: "text/csv" },
        ),
      );
      downloadLink.download = `registrants-${String(eventRecord.title).toLowerCase().replace(/\W+/g, "-")}.csv`;
      downloadLink.click();
      URL.revokeObjectURL(downloadLink.href);
      showToastMessage(`Exported ${regs().length} registrants.`);
    } else if (clickedButton.dataset.a === "addfield") {
      const label = findDialogElement("#fb-label").value.trim(),
        type = findDialogElement("#fb-type").value,
        options = findDialogElement("#fb-opts").value.trim();
      if (!label) return showToastMessage("Enter a question for the new field.", "error");
      if (type === "select" && !options)
        return showToastMessage("Add at least one choice.", "error");
      registrationConfiguration.fields.push({
        key: `c_${Date.now().toString(36)}`,
        label,
        type,
        required: false,
        ...(type === "select" ? { options } : {}),
      });
      saveRegistrationDatabase();
      drawPane();
      showToastMessage("Field added.");
    } else if (clickedButton.dataset.rm) {
      if (
        await askForConfirmation(
          `Remove "${registrationConfiguration.fields[clickedButton.dataset.rm].label}" from this event's form?`,
          "Remove",
        )
      ) {
        registrationConfiguration.fields.splice(Number(clickedButton.dataset.rm), 1);
        saveRegistrationDatabase();
        drawPane();
      }
    } else if (clickedButton.dataset.a === "reset") {
      if (
        await askForConfirmation(
          "Reset this event's form to the standard fields? Custom questions will be removed.",
          "Reset",
        )
      ) {
        registrationConfiguration.fields = STANDARD_REGISTRATION_FIELDS.map((standardField) => ({ ...standardField }));
        saveRegistrationDatabase();
        drawPane();
      }
    }
  });
  eventDialog.addEventListener("change", (changeEvent) => {
    const changedElement = changeEvent.target;
    if (changedElement.dataset.rid) {
      const registration = regs().find((candidateRegistration) => candidateRegistration.id === changedElement.dataset.rid);
      registration.status = changedElement.value;
      saveRegistrationDatabase();
      drawTop();
      showToastMessage(`${registration.name}: ${changedElement.value}.`);
    } else if (changedElement.dataset.req !== undefined) {
      registrationConfiguration.fields[changedElement.dataset.req].required = changedElement.checked;
      saveRegistrationDatabase();
    } else if (changedElement.id === "rg-deadline") {
      registrationConfiguration.deadline = changedElement.value;
      saveRegistrationDatabase();
      drawTop();
      showToastMessage(changedElement.value ? `Deadline set to ${formatDate(changedElement.value)}.` : "Deadline cleared.");
    } else if (changedElement.id === "rg-st") {
      dialogState.status = changedElement.value;
      drawBody();
    }
  });
  eventDialog.addEventListener("input", (inputEvent) => {
    if (inputEvent.target.id === "rg-q") {
      dialogState.q = inputEvent.target.value;
      drawBody();
    }
  });
  drawPane();
}
document.addEventListener("sbg:event-details", (customEvent) => openEvent(customEvent.detail));

