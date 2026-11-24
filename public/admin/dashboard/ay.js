/*
  Academic-year helpers shared by the whole dashboard.

  The organisation's academic year runs from August 1 to July 31 and is always
  worked out in Philippine time (Asia/Manila). The new year starts by itself on
  August 1, so administrators never have to switch it manually.

  Imported by: dashboard.js, dashboard-shell.js, members.js, registrations.js,
  reports.js and academic.js. Keeping the rules here means every page agrees on
  what "the current academic year" means.

  Academic years are written as text such as "2026-2027" (start year, dash, end year).
*/

// ==========================================
// DATES IN PHILIPPINE TIME
// ==========================================

export const MANILA_TIME_ZONE = "Asia/Manila";

// The first academic year the dashboard lists in its year pickers.
const FIRST_SELECTABLE_ACADEMIC_YEAR_START = 2025;

// Academic years begin in August (month number 8).
const ACADEMIC_YEAR_START_MONTH = 8;

/**
 * Splits a date into year, month and day AS SEEN IN MANILA, not in the
 * visitor's own time zone. This keeps the academic year correct even when the
 * dashboard is opened from another country.
 *
 * @param {Date|string} dateToInspect - A Date object or a date string.
 * @returns {{year: string, month: string, day: string}} Two-digit month and day.
 * @throws {RangeError} If the value is not a valid date.
 */
function getDatePartsInManila(dateToInspect = new Date()) {
  const parsedDate =
    dateToInspect instanceof Date ? dateToInspect : new Date(dateToInspect);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new RangeError("Invalid date passed to getDatePartsInManila()");
  }

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsedDate);

  return Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
}

/**
 * Returns the given moment as a YYYY-MM-DD date in Manila time.
 *
 * @param {Date} [selectedDate] - Defaults to "right now".
 * @returns {string} For example "2026-11-22".
 */
export function getTodayInManila(selectedDate = new Date()) {
  const { year, month, day } = getDatePartsInManila(selectedDate);
  return `${year}-${month}-${day}`;
}

// ==========================================
// ACADEMIC YEAR CALCULATIONS
// ==========================================

/**
 * Finds the academic year that contains a date.
 *
 * August to December belong to "this year to next year".
 * January to July belong to "last year to this year".
 * Example: July 2026 -> "2025-2026", August 2026 -> "2026-2027".
 *
 * @param {Date} [selectedDate] - Defaults to "right now".
 * @returns {string} The academic year, for example "2026-2027".
 */
export function getCurrentAcademicYear(selectedDate = new Date()) {
  const { year, month } = getDatePartsInManila(selectedDate);

  const calendarYear = Number(year);
  const calendarMonth = Number(month);

  const academicYearStart =
    calendarMonth >= ACADEMIC_YEAR_START_MONTH ? calendarYear : calendarYear - 1;

  return `${academicYearStart}-${academicYearStart + 1}`;
}

/**
 * Finds the academic year of a date written as YYYY-MM-DD.
 * (Same rule as getCurrentAcademicYear, but for a stored date such as an event date.)
 *
 * @param {string} isoDate - For example "2026-09-12".
 * @returns {string} For example "2026-2027".
 */
export function getAcademicYearOfDate(isoDate) {
  const calendarYear = Number(isoDate.slice(0, 4));
  const calendarMonth = Number(isoDate.slice(5, 7));

  const academicYearStart =
    calendarMonth >= ACADEMIC_YEAR_START_MONTH ? calendarYear : calendarYear - 1;

  return `${academicYearStart}-${academicYearStart + 1}`;
}

/**
 * Turns "2026-2027" into the friendly label "A.Y. 2026–2027".
 *
 * @param {string} academicYear - For example "2026-2027".
 * @returns {string}
 */
export function formatAcademicYearLabel(academicYear) {
  return `A.Y. ${String(academicYear).replace("-", "–")}`;
}

/**
 * Gives the first and last day of an academic year.
 *
 * @param {string} academicYear - For example "2026-2027".
 * @returns {{start: string, end: string}} "2026-08-01" and "2027-07-31".
 */
export function getAcademicYearDateRange(academicYear) {
  const startYear = Number(String(academicYear).slice(0, 4));

  return {
    start: `${startYear}-08-01`,
    end: `${startYear + 1}-07-31`,
  };
}

/**
 * Lists the academic years an administrator can pick, newest first.
 * It starts at the first supported year and ends at the current academic year.
 *
 * @param {Date} [selectedDate] - Defaults to "right now".
 * @returns {string[]} For example ["2026-2027", "2025-2026"].
 */
export function getAcademicYearChoices(selectedDate = new Date()) {
  const currentStartYear = Number(
    getCurrentAcademicYear(selectedDate).slice(0, 4),
  );
  const academicYearChoices = [];

  for (
    let startYear = currentStartYear;
    startYear >= FIRST_SELECTABLE_ACADEMIC_YEAR_START;
    startYear--
  ) {
    academicYearChoices.push(`${startYear}-${startYear + 1}`);
  }

  return academicYearChoices;
}

// ==========================================
// THE ACADEMIC YEAR CURRENTLY BEING VIEWED
// ==========================================

/**
 * The year the administrator is looking at right now.
 * dashboard-shell.js changes `selected` when the year picker is used; every
 * page reads it. It starts as the current academic year and is deliberately
 * NOT saved, so each visit begins on the live year (including after August 1).
 */
export const academicYearSelection = {
  selected: getCurrentAcademicYear(),
};

// ==========================================
// OFFICER POSITIONS
// ==========================================

/** Offices in the order they should always be listed. */
export const OFFICE_ORDER = [
  "Executive",
  "Creatives",
  "Finance",
  "Technology",
  "Relations",
  "Marketing",
  "Operations",
];

/**
 * True when a position title means "adviser". Advisers belong to the
 * organisation, not to one academic year, so they are always shown.
 *
 * @param {string} positionTitle - For example "Organization Adviser".
 * @returns {boolean}
 */
export function isAdviserTitle(positionTitle) {
  return /^(?:adviser|advisor|org\s+adviser|org\s+advisor|organization\s+adviser|organization\s+advisor)$/i.test(
    String(positionTitle ?? "").trim(),
  );
}

/**
 * Gives a title a rank so leaders always sort first:
 * 0 = Director, 1 = Assistant Director, 2 = Secretary, 3 = other directors, 4 = everyone else.
 *
 * @param {string} positionTitle - For example "Assistant Director".
 * @returns {number} A smaller number means a higher position in the list.
 */
export function getPositionTitleRank(positionTitle) {
  const normalizedTitle = String(positionTitle ?? "").trim().toLowerCase();

  if (/^executive director$|^director$/.test(normalizedTitle)) return 0;

  if (/assistant director|deputy director|asst\.?\s*director/i.test(normalizedTitle)) {
    return 1;
  }

  if (/executive secretary|exec secretary|secretary/i.test(normalizedTitle)) {
    return 2;
  }

  if (/director/i.test(normalizedTitle)) return 3;

  return 4;
}

/**
 * Lists the officer positions that belong to one academic year.
 * Only published officers are included. Advisers are included for every year.
 *
 * @param {object[]} officerRecords - Officers as loaded from the officers API.
 * @param {string} academicYear - For example "2026-2027".
 * @returns {Array<{officer: object, position: object, isAdviser: boolean}>}
 */
export function getOfficerSeatsForAcademicYear(officerRecords, academicYear) {
  return officerRecords
    .filter((officer) => officer.status === "published")
    .flatMap((officer) =>
      (officer.positions ?? [])
        .filter(
          (position) =>
            isAdviserTitle(position.title) || position.year === academicYear,
        )
        .map((position) => ({
          officer,
          position,
          isAdviser: isAdviserTitle(position.title),
        })),
    );
}
