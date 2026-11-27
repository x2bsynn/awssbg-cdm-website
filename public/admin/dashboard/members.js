/*
  Members module.
  Uses browser localStorage sample data until a members backend is connected.
  Provides membership status/history, member dialogs, table rendering, CSV export,
  and exports memberStats/getMembers/recentRenewals to the shell and reports.
*/
import {
  getCurrentAcademicYear,
  academicYearSelection,
  formatAcademicYearLabel,
  getAcademicYearDateRange,
  getTodayInManila,
  getAcademicYearChoices,
} from "./ay.js";
import {
  escapeHtml, 
  formatDate,
  getElementById,
  showToastMessage,
} from "./utilities.js";

// ==========================================
// SHARED HELPERS AND SETTINGS
// ==========================================

// LocalStorage key for demonstration member records; this is replaced by API data when available.
const MEMBERS_STORAGE_KEY = "sbg-members-sample-v1";
export const ACADEMIC_PROGRAMS = {
  Archi: "Architecture",
  CE: "Civil Engineering",
  CpE: "Computer Engineering",
  EE: "Electrical Engineering",
  ECE: "Electronics Engineering",
  EnSE: "Environmental and Sanitary Engineering",
  IE: "Industrial Engineering",
  ME: "Mechanical Engineering",
  MEE: "Microelectronics Engineering",
  REM: "Railway Engineering Management",
};
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
const STATUSES = ["Active", "Inactive"];
/**
 * Returns the first calendar year of an academic year, e.g. "2026-2027" -> 2026.
 *
 * @param {*} academicYear - Text in YYYY-YYYY format.
 * @returns {number} The start year.
 */
const getAcademicYearStart = (academicYear) => Number(academicYear.slice(0, 4));
/**
 * Returns the academic year before the given one, e.g. "2026-2027" -> "2025-2026".
 *
 * @param {*} academicYear - Text in YYYY-YYYY format.
 * @returns {string} The previous academic year.
 */
const getPreviousAcademicYear = (academicYear) =>
  `${getAcademicYearStart(academicYear) - 1}-${getAcademicYearStart(academicYear)}`;
const getSelectableAcademicYears = () => getAcademicYearChoices();
/**
 * Makes the two-letter initials shown in a member's avatar circle.
 *
 * @param {*} fullName - The member's full name.
 * @returns {string} For example "Ana Cruz" -> "AC".
 */
const getInitials = (fullName) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0].toUpperCase())
    .join("");

/*
  Generates representative member records for local demonstration and testing.
  This data is intentionally separate from any real student database.
*/
function sample() {
  let seed = 20260;
  const getNextRandomNumber = () =>
    (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pick = (choices) =>
    choices[Math.floor(getNextRandomNumber() * choices.length)];
  const SAMPLE_FIRST_NAMES = [
    "Aira",
    "Bianca",
    "Carlo",
    "Denise",
    "Elijah",
    "Faith",
    "Gabriel",
    "Hannah",
    "Isaac",
    "Jasmine",
    "Khalie",
    "Lia",
    "Miguel",
    "Nina",
    "Oscar",
    "Paula",
    "Rafael",
    "Sofia",
    "Tristan",
    "Yana",
  ];
  const SAMPLE_LAST_NAMES = [
    "Alcantara",
    "Bautista",
    "Cruz",
    "Dizon",
    "Espino",
    "Fajardo",
    "Garcia",
    "Hernandez",
    "Ignacio",
    "Javier",
    "Lazaro",
    "Mendoza",
    "Navarro",
    "Ocampo",
    "Panganiban",
    "Quiambao",
    "Ramos",
    "Santos",
    "Tolentino",
    "Villanueva",
  ];
  const selectableAcademicYears = getSelectableAcademicYears().reverse(),
    currentAcademicYear = getCurrentAcademicYear(),
    padWithZero = (number) => String(number).padStart(2, "0");
  return Array.from({ length: 54 }, (unusedItem, memberIndex) => {
    const joinedAY = pick(selectableAcademicYears),
      records = [];
    let isStillMember = true;
    for (const academicYear of selectableAcademicYears.filter(
      (candidateYear) => candidateYear >= joinedAY,
    )) {
      const first = academicYear === joinedAY;
      if (!(first || getNextRandomNumber() < (isStillMember ? 0.72 : 0.2))) {
        isStillMember = false;
        continue;
      }
      isStillMember = true;
      records.push({
        ay: academicYear,
        status:
          academicYear === currentAcademicYear &&
          !first &&
          getNextRandomNumber() < 0.15
            ? "pending"
            : "renewed",
        renewalDate: `${getAcademicYearStart(academicYear)}-${pick(["08", "09", "10"])}-${padWithZero(1 + Math.floor(getNextRandomNumber() * 27))}`,
      });
    }
    const recent = records.some(
      (renewalRecord) =>
        renewalRecord.ay === currentAcademicYear ||
        renewalRecord.ay === getPreviousAcademicYear(currentAcademicYear),
    );
    const first = pick(SAMPLE_FIRST_NAMES),
      last = pick(SAMPLE_LAST_NAMES),
      slug = `${first}.${last}`.toLowerCase();
    return {
      id: `SBG-${String(memberIndex + 1).padStart(4, "0")}`,
      name: `${first} ${last}`,
      studentNumber: `${2022 + Math.floor(getNextRandomNumber() * 4)}${String(10000 + Math.floor(getNextRandomNumber() * 89999))}`,
      program: pick(Object.keys(ACADEMIC_PROGRAMS)),
      yearLevel: pick(YEARS.slice(0, 4)),
      birthdate: `${2002 + Math.floor(getNextRandomNumber() * 5)}-${padWithZero(1 + Math.floor(getNextRandomNumber() * 12))}-${padWithZero(1 + Math.floor(getNextRandomNumber() * 28))}`,
      cdmEmail: `${slug}@cdm.edu.ph`,
      personalEmail: `${slug}${memberIndex}@example.com`,
      joinedAY,
      archived: !recent && getNextRandomNumber() < 0.5,
      records,
    };
  });
}
/**
 * Saves the member list in this browser (localStorage). Replace with an API call when a members backend exists.
 *
 * @param {*} memberList - The complete array of members.
 */
const save = (list) => {
  try {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
};
/*
  Loads saved local member records, or creates the initial sample dataset.
  Replaces generated data when a real member API is connected.
*/
function load() {
  try {
    const savedMembers = JSON.parse(localStorage.getItem(MEMBERS_STORAGE_KEY));
    if (Array.isArray(savedMembers) && savedMembers.length) return savedMembers;
  } catch {
    /* regenerate */
  }
  const generatedSampleMembers = sample();
  save(generatedSampleMembers);
  return generatedSampleMembers;
}
let members = load();

// Status is derived from the selected A.Y.'s renewal record, never from mere existence in the list.
/*
  Derives the membership status for one academic year from renewal history.
  It deliberately keeps Active/Inactive separate from the independent Archived flag.
*/
// Determines whether a member is active or inactive for the selected academic year.
function getMemberStatus(member, academicYear) {
  const renewalRecord = member.records.find(
    (record) => record.ay === academicYear,
  );
  if (renewalRecord) {
    return renewalRecord.status === "renewed" ? "Active" : "Inactive";
  }
  if (member.joinedAY > academicYear) return null;
  return "Inactive";
}
/**
 * Counts how many academic years a member renewed (their "terms").
 *
 * @param {*} member - One member record.
 * @returns {number} Number of renewed years.
 */
const getMembershipTermCount = (member) =>
  member.records.filter((record) => record.status === "renewed").length;
/**
 * Finds the most recent renewal date of a member.
 *
 * @param {*} member - One member record.
 * @returns {string} Date as YYYY-MM-DD, or "" when never renewed.
 */
const getLastRenewalDate = (member) =>
  member.records
    .filter((record) => record.status === "renewed")
    .map((record) => record.renewalDate)
    .sort()
    .pop() ?? "";

/*
  Produces counts used by Members, Overview, and Reports.
  The selected academic year determines which renewal record is counted.
*/
export function getMembershipStatistics(
  academicYear = academicYearSelection.selected,
) {
  const membersWithStatus = members
    .map((member) => ({ m: member, s: getMemberStatus(member, academicYear) }))
    .filter((memberEntry) => memberEntry.s);
  const countWithStatus = (statusName) =>
    membersWithStatus.filter((memberEntry) => memberEntry.s === statusName)
      .length;
  const prevActive = members.filter(
    (member) =>
      getMemberStatus(member, getPreviousAcademicYear(academicYear)) ===
      "Active",
  );
  const kept = prevActive.filter(
    (member) => getMemberStatus(member, academicYear) === "Active",
  ).length;
  return {
    total: membersWithStatus.length,
    active: countWithStatus("Active"),
    inactive: countWithStatus("Inactive"),
    newMemberCount: membersWithStatus.filter(
      (memberEntry) =>
        memberEntry.s === "Active" && memberEntry.m.joinedAY === academicYear,
    ).length,
    returning: membersWithStatus.filter(
      (memberEntry) =>
        memberEntry.s === "Active" && memberEntry.m.joinedAY < academicYear,
    ).length,
    renewalRate: prevActive.length
      ? Math.round((kept / prevActive.length) * 100)
      : null,
    growth: prevActive.length
      ? countWithStatus("Active") - prevActive.length
      : null,
  };
}

/* ---------- dialogs ---------- */
export function openModalDialog(html, extraClassName = "") {
  const dialogElement = document.createElement("dialog");
  dialogElement.className = `mdlg ${extraClassName}`;
  dialogElement.innerHTML = html;
  document.body.append(dialogElement);
  dialogElement.addEventListener("close", () => dialogElement.remove());
  dialogElement.showModal();
  const nativeClose = dialogElement.close.bind(dialogElement); // short exit animation before closing
  dialogElement.close = () => {
    dialogElement.classList.add("is-closing");
    setTimeout(nativeClose, 140);
  };
  return dialogElement;
}
/**
 * Shows a confirmation dialog (used before archiving, resetting, removing).
 *
 * @param {*} confirmationMessage - The question to ask.
 * @param {*} confirmButtonLabel - Text of the confirm button, e.g. "Archive".
 * @returns {Promise<boolean>} Resolves to true when the administrator confirms, false when they cancel.
 */
export const askForConfirmation = (confirmationMessage, confirmButtonLabel) =>
  new Promise((resolveDecision) => {
    let isConfirmed = false;
    const confirmDialog = openModalDialog(
      `<h3>Please confirm</h3><p>${escapeHtml(confirmationMessage)}</p><div class="mact"><button class="button button-light" data-v="0">Cancel</button><button class="button button-primary" data-v="1">${escapeHtml(confirmButtonLabel)}</button></div>`,
      "mconfirm",
    );
    confirmDialog.addEventListener("click", (clickEvent) => {
      const clickedButton = clickEvent.target.closest("[data-v]");
      if (clickedButton) {
        isConfirmed = clickedButton.dataset.v === "1";
        confirmDialog.close();
      }
    });
    confirmDialog.addEventListener("close", () => resolveDecision(isConfirmed));
  });

/* ---------- state & table ---------- */
const memberTableState = {
  q: "",
  program: "",
  year: "",
  status: "",
  sort: "name",
};
/**
 * Turns text into a lowercase word with dashes, used for CSS class names such as "ms-active".
 *
 * @param {*} text - Any text.
 * @returns {string} The dashed lowercase text.
 */
const slug = (text) => text.toLowerCase().replace(/\s+/g, "-");

/*
  Applies member search, program/year/status filters, and sorting.
  Rendering and CSV export both use this single filtered result list.
*/
function getFilteredMemberRows() {
  const academicYear = academicYearSelection.selected,
    searchText = memberTableState.q.trim().toLowerCase();
  const list = members
    .map((member) => ({ m: member, s: getMemberStatus(member, academicYear) }))
    .filter((memberEntry) => memberEntry.s);
  return list
    .filter(
      ({ m: member, s: status }) =>
        (!searchText ||
          [member.name, member.studentNumber, member.id].some(
            (searchableValue) =>
              searchableValue.toLowerCase().includes(searchText),
          )) &&
        (!memberTableState.program ||
          member.program === memberTableState.program) &&
        (!memberTableState.year ||
          member.yearLevel === memberTableState.year) &&
        (!memberTableState.status || status === memberTableState.status),
    )
    .sort((firstEntry, secondEntry) =>
      memberTableState.sort === "joined"
        ? secondEntry.m.joinedAY.localeCompare(firstEntry.m.joinedAY) ||
          firstEntry.m.name.localeCompare(secondEntry.m.name)
        : memberTableState.sort === "status"
          ? STATUSES.indexOf(firstEntry.s) - STATUSES.indexOf(secondEntry.s) ||
            firstEntry.m.name.localeCompare(secondEntry.m.name)
          : firstEntry.m.name.localeCompare(secondEntry.m.name),
    );
}

/*
  Renders the current page of member rows and updates the member pager state.
  Page size and page number are controlled locally in this module.
*/
function renderTable() {
  const academicYear = academicYearSelection.selected,
    all = members
      .map((member) => getMemberStatus(member, academicYear))
      .filter(Boolean),
    list = getFilteredMemberRows();
  getElementById("m-chips").innerHTML = [
    ["", "All", all.length],
    ...STATUSES.map((statusName) => [
      statusName,
      statusName,
      all.filter((statusOfMember) => statusOfMember === statusName).length,
    ]),
  ]
    .map(
      ([statusValue, statusLabel, statusCount]) =>
        `<button type="button" class="chip" aria-pressed="${memberTableState.status === statusValue}" data-status="${statusValue}">${statusLabel} <b>${statusCount}</b></button>`,
    )
    .join("");
  getElementById("m-body").innerHTML =
    list
      .map(
        ({ m: member, s: status }) => `
    <tr><td data-label="Member"><span class="m-who"><span class="m-av">${escapeHtml(getInitials(member.name))}</span><span><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.id)}</small></span></span></td>
    <td data-label="Student no.">${escapeHtml(member.studentNumber)}</td><td data-label="Program">${escapeHtml(member.program)}</td><td data-label="Year">${escapeHtml(member.yearLevel)}</td>
    <td data-label="Status"><span class="ms ms-${slug(status)}">${status}</span></td><td data-label="Joined">${formatAcademicYearLabel(member.joinedAY)}</td>
    <td data-label="Terms">${getMembershipTermCount(member)}</td><td data-label="Last renewal">${formatDate(getLastRenewalDate(member))}</td>
    <td><button class="button button-light" data-view-member="${escapeHtml(member.id)}">View</button></td></tr>`,
      )
      .join("") ||
    `<tr><td colspan="9" class="empty-cell">${members.length ? "No members match your filters." : "No members yet."}</td></tr>`;
  // table-standard.js adds the paging controls and the "Showing 1-25 of N" label.
  const memberCountLabel = getElementById("m-count");
  if (memberCountLabel) {
    memberCountLabel.textContent = `${list.length} member${list.length === 1 ? "" : "s"} · ${formatAcademicYearLabel(academicYear)}`;
  }
}

/* ---------- profile / form ---------- */
/*
  Opens a member profile dialog with membership validity and renewal history.
  Renewal, restore/archive, edit, and close actions are handled here.
*/
function openProfile(memberId) {
  const member = members.find(
    (candidateMember) => candidateMember.id === memberId,
  );
  if (!member) return;
  const academicYear = academicYearSelection.selected,
    status = getMemberStatus(member, academicYear) ?? "Not yet a member",
    valid = status === "Active";
  const profileDialog = openModalDialog(
    `<div class="m-head"><span class="m-av big">${escapeHtml(getInitials(member.name))}</span><div><h3>${escapeHtml(member.name)}</h3><small>${escapeHtml(member.id)} · <span class="ms ms-${slug(status)}">${status}</span></small></div></div>
    <dl class="m-dl"><div><dt>Student number</dt><dd>${escapeHtml(member.studentNumber)}</dd></div><div><dt>Program</dt><dd>${escapeHtml(ACADEMIC_PROGRAMS[member.program] ?? member.program)}</dd></div>
    <div><dt>Year level</dt><dd>${escapeHtml(member.yearLevel)}</dd></div><div><dt>Birthday</dt><dd>${formatDate(member.birthdate)}</dd></div>
    <div><dt>CDM email</dt><dd>${escapeHtml(member.cdmEmail)}</dd></div><div><dt>Personal email</dt><dd>${escapeHtml(member.personalEmail) || "—"}</dd></div>
    <div><dt>Joined</dt><dd>${formatAcademicYearLabel(member.joinedAY)}</dd></div><div><dt>Terms as member</dt><dd>${getMembershipTermCount(member)}</dd></div>
    <div><dt>Last renewal</dt><dd>${formatDate(getLastRenewalDate(member))}</dd></div><div><dt>Validity (${formatAcademicYearLabel(academicYear)})</dt><dd>${valid ? `Until ${formatDate(getAcademicYearDateRange(academicYear).end)}` : "Not valid"}</dd></div></dl>
    <h4>Renewal history</h4><ul class="m-hist">${[...member.records]
      .sort((firstRecord, secondRecord) =>
        secondRecord.ay.localeCompare(firstRecord.ay),
      )
      .map(
        (renewalRecord) =>
          `<li><span>${formatAcademicYearLabel(renewalRecord.ay)}</span><span>${renewalRecord.status === "renewed" ? "Active" : "Inactive"} · ${formatDate(renewalRecord.renewalDate)}</span></li>`,
      )
      .join("")}</ul>
    <div class="mact"><button class="button button-light" data-a="close">Close</button><button class="button button-light" data-a="edit">Edit</button>
    <button class="button button-light" data-a="archive">${member.archived ? "Restore" : "Archive"}</button>
    ${valid || status === "Not yet a member" ? "" : `<button class="button button-primary" data-a="renew">Renew for ${formatAcademicYearLabel(academicYear)}</button>`}</div>`,
    "mprofile",
  );
  profileDialog.addEventListener("click", async (clickEvent) => {
    const clickedAction = clickEvent.target.closest("[data-a]")?.dataset.a;
    if (!clickedAction) return;
    if (clickedAction === "close") profileDialog.close();
    else if (clickedAction === "edit") {
      profileDialog.close();
      openForm(memberId);
    } else if (clickedAction === "renew") {
      const existingRecord = member.records.find(
          (renewalRecord) => renewalRecord.ay === academicYear,
        ),
        date = getTodayInManila();
      if (existingRecord)
        Object.assign(existingRecord, { status: "renewed", renewalDate: date });
      else
        member.records.push({
          ay: academicYear,
          status: "renewed",
          renewalDate: date,
        });
      member.archived = false;
      save(members);
      profileDialog.close();
      renderTable();
      showToastMessage(
        `${member.name} renewed for ${formatAcademicYearLabel(academicYear)}.`,
      );
    } else if (clickedAction === "archive") {
      if (
        !member.archived &&
        !(await askForConfirmation(
          `Archive ${member.name}? Their record and history are kept and can be restored.`,
          "Archive",
        ))
      )
        return;
      member.archived = !member.archived;
      save(members);
      profileDialog.close();
      renderTable();
      showToastMessage(
        member.archived
          ? `${member.name} archived.`
          : `${member.name} restored.`,
      );
    }
  });
}

/*
  Opens the Add/Edit Member form and validates the submitted fields.
  Submitting a new member creates a renewal record for its joined academic year.
*/
function openForm(memberId) {
  const member = memberId
      ? members.find((candidateMember) => candidateMember.id === memberId)
      : null,
    getEscapedMemberValue = (fieldName) =>
      escapeHtml(member?.[fieldName] ?? "");
  const opts = (list, selectedValue) =>
    list
      .map(
        ([optionValue, optionLabel]) =>
          `<option value="${optionValue}"${optionValue === selectedValue ? " selected" : ""}>${optionLabel}</option>`,
      )
      .join("");
  const formDialog =
    openModalDialog(`<h3>${member ? "Edit member" : "Add member"}</h3><form class="m-form" novalidate>
    <label>Full name *<input name="name" value="${getEscapedMemberValue("name")}" maxlength="150"></label>
    <label>Student number *<input name="studentNumber" value="${getEscapedMemberValue("studentNumber")}" inputmode="numeric" maxlength="30"></label>
    <label>Program *<select name="program"><option value="">Select</option>${opts(
      Object.entries(ACADEMIC_PROGRAMS).map(([programCode, programName]) => [
        programCode,
        programName,
      ]),
      member?.program,
    )}</select></label>
    <label>Year level *<select name="yearLevel"><option value="">Select</option>${opts(
      YEARS.map((yearLevel) => [yearLevel, yearLevel]),
      member?.yearLevel,
    )}</select></label>
    <label>Birthday *<input name="birthdate" type="date" value="${getEscapedMemberValue("birthdate")}" max="${getTodayInManila()}"></label>
    <label>Academic year joined<select name="joinedAY"${member ? " disabled" : ""}>${opts(
      getSelectableAcademicYears().map((academicYear) => [
        academicYear,
        formatAcademicYearLabel(academicYear),
      ]),
      member?.joinedAY ?? academicYearSelection.selected,
    )}</select></label>
    <label>CDM email *<input name="cdmEmail" type="email" value="${getEscapedMemberValue("cdmEmail")}" placeholder="name@cdm.edu.ph"></label>
    <label>Personal email<input name="personalEmail" type="email" value="${getEscapedMemberValue("personalEmail")}"></label>
    <p class="m-err" role="alert" hidden></p>
    <div class="mact"><button type="button" class="button button-light" data-a="cancel">Cancel</button><button type="submit" class="button button-primary">${member ? "Save changes" : "Add member"}</button></div></form>`);
  formDialog
    .querySelector('[data-a="cancel"]')
    .addEventListener("click", () => formDialog.close());
  formDialog.querySelector("form").addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const formValues = Object.fromEntries(new FormData(submitEvent.target)),
      errorElement = formDialog.querySelector(".m-err");
    formValues.name = formValues.name.trim();
    formValues.studentNumber = formValues.studentNumber.trim();
    formValues.cdmEmail = formValues.cdmEmail.trim();
    const validationMessage = !formValues.name
      ? "Enter the member's full name."
      : !/^\d{5,30}$/.test(formValues.studentNumber)
        ? "Student number must be digits only (at least 5)."
        : members.some(
              (otherMember) =>
                otherMember.studentNumber === formValues.studentNumber &&
                otherMember.id !== memberId,
            )
          ? "That student number already exists."
          : !formValues.program || !formValues.yearLevel
            ? "Choose a program and year level."
            : !formValues.birthdate
              ? "Enter a birthday."
              : !/^[^\s@]+@cdm\.edu\.ph$/i.test(formValues.cdmEmail)
                ? "CDM email must end in @cdm.edu.ph."
                : formValues.personalEmail &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.personalEmail)
                  ? "Personal email is not valid."
                  : "";
    if (validationMessage) {
      errorElement.textContent = validationMessage;
      errorElement.hidden = false;
      return;
    }
    if (member)
      Object.assign(member, {
        name: formValues.name,
        studentNumber: formValues.studentNumber,
        program: formValues.program,
        yearLevel: formValues.yearLevel,
        birthdate: formValues.birthdate,
        cdmEmail: formValues.cdmEmail,
        personalEmail: formValues.personalEmail,
      });
    else {
      const next =
        Math.max(
          0,
          ...members.map((existingMember) =>
            Number(existingMember.id.slice(4)),
          ),
        ) + 1;
      members.push({
        id: `SBG-${String(next).padStart(4, "0")}`,
        name: formValues.name,
        studentNumber: formValues.studentNumber,
        program: formValues.program,
        yearLevel: formValues.yearLevel,
        birthdate: formValues.birthdate,
        cdmEmail: formValues.cdmEmail,
        personalEmail: formValues.personalEmail,
        joinedAY: formValues.joinedAY,
        archived: false,
        records: [
          {
            ay: formValues.joinedAY,
            status: "renewed",
            renewalDate: getTodayInManila(),
          },
        ],
      });
    }
    save(members);
    formDialog.close();
    renderTable();
    showToastMessage(member ? "Member updated." : `${formValues.name} added.`);
  });
}

/*
  Exports the current filtered/sorted member rows as a UTF-8 CSV file.
  It does not export hidden pages or unrelated sample data.
*/
function exportCsv() {
  const list = getFilteredMemberRows(),
    quoteCsvCell = (cellValue) =>
      `"${String(cellValue ?? "").replace(/"/g, '""')}"`;
  const head = [
    "Member ID",
    "Name",
    "Student number",
    "Program",
    "Year level",
    "Status",
    "Joined",
    "Terms",
    "Last renewal",
    "CDM email",
    "Personal email",
    "Birthday",
  ];
  const csvRows = [
    head,
    ...list.map(({ m: member, s: status }) => [
      member.id,
      member.name,
      member.studentNumber,
      member.program,
      member.yearLevel,
      status,
      member.joinedAY,
      getMembershipTermCount(member),
      getLastRenewalDate(member),
      member.cdmEmail,
      member.personalEmail,
      member.birthdate,
    ]),
  ]
    .map((csvRow) => csvRow.map(quoteCsvCell).join(","))
    .join("\r\n");
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(
    new Blob(["\ufeff" + csvRows], { type: "text/csv" }),
  );
  downloadLink.download = `members-${academicYearSelection.selected}.csv`;
  downloadLink.click();
  URL.revokeObjectURL(downloadLink.href);
  showToastMessage(`Exported ${list.length} members.`);
}

/*
  Initializes the Members view markup and wires all member controls.
  renderTable() is called immediately so the view is populated on navigation.
*/
function init() {
  const membersView = getElementById("members-view");
  if (!membersView) return;
  membersView.innerHTML = `<div class="page-head"><div><div class="eyebrow">Membership database</div><h1>Members</h1>
    <p class="subtitle">Status follows each academic year's renewal record.</p></div>
    <div class="m-actions"><button class="button button-light" id="m-reset">Reset sample data</button><button class="button button-light" id="m-export">Export CSV</button><button class="button button-primary" id="m-add"><i data-icon="plus"></i> Add member</button></div></div>
    <div id="m-chips" class="chips"></div>
    <div class="table-wrap"><table class="m-table"><thead><tr><th>Member</th><th>Student no.</th><th>Program</th><th>Year</th><th>Status</th><th>Joined</th><th>Terms</th><th>Last renewal</th><th></th></tr></thead><tbody id="m-body"></tbody></table></div>
    `;
  const addListenerById = (elementId, eventName, eventHandler) =>
    getElementById(elementId).addEventListener(eventName, eventHandler);
  addListenerById("m-add", "click", () => openForm(null));
  addListenerById("m-export", "click", exportCsv);
  addListenerById("m-reset", "click", async () => {
    if (
      await askForConfirmation(
        "Replace all member records with freshly generated sample data? Your edits will be lost.",
        "Reset",
      )
    ) {
      members = sample();
      save(members);
      renderTable();
      showToastMessage("Sample data reset.");
    }
  });
  addListenerById("m-chips", "click", (clickEvent) => {
    const clickedStatusChip = clickEvent.target.closest("[data-status]");
    if (clickedStatusChip) {
      memberTableState.status = clickedStatusChip.dataset.status;
      renderTable();
    }
  });
  addListenerById("m-body", "click", (clickEvent) => {
    const clickedViewButton = clickEvent.target.closest("[data-view-member]");
    if (clickedViewButton) openProfile(clickedViewButton.dataset.viewMember);
  });
  renderTable();
}
init();
document.addEventListener("sbg:ay", () => {
  renderTable();
});

/**
 * Gives other modules (reports, registrations) read access to the member list.
 *
 * @returns {object[]} All members.
 */
export const getMembers = () => members;
/**
 * Lists the newest membership renewals for the Overview activity feed.
 *
 * @param {*} maximumItems - How many items to return.
 * @returns {object[]} Items with a date and a text sentence.
 */
export const getRecentRenewals = (maximumItems = 6) =>
  members
    .flatMap((member) =>
      member.records
        .filter(
          (renewalRecord) =>
            renewalRecord.status === "renewed" &&
            renewalRecord.renewalDate <= getTodayInManila(),
        )
        .map((renewalRecord) => ({
          date: renewalRecord.renewalDate,
          text: `${member.name} renewed membership for ${formatAcademicYearLabel(renewalRecord.ay)}`,
        })),
    )
    .sort((firstItem, secondItem) =>
      secondItem.date.localeCompare(firstItem.date),
    )
    .slice(0, maximumItems);
