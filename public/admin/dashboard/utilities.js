/*
  Shared helper functions used by several dashboard modules.
  Keeping them in one file avoids copy-pasting the same code into every module.
  Imported by: dashboard-shell.js, members.js, registrations.js, reports.js, academic.js.
*/

/**
 * Shortcut for finding one element on the page by its id.
 *
 * @param {string} elementId - The id attribute of the element.
 * @returns {HTMLElement|null} The element, or null when it does not exist.
 */
export function getElementById(elementId) {
  return document.getElementById(elementId);
}

/**
 * Makes text safe to place inside HTML that we build as a string.
 * Without this, a name such as "<b>Ana</b>" would be treated as real HTML.
 *
 * @param {*} unsafeValue - Any value that will be shown on the page.
 * @returns {string} The same text with special HTML characters replaced.
 */
export function escapeHtml(unsafeValue) {
  const htmlEscapeCharacters = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(unsafeValue ?? "").replace(
    /[&<>"']/g,
    (character) => htmlEscapeCharacters[character],
  );
}

/**
 * Formats a date string such as "2026-08-15" for display, for example "Aug 15, 2026".
 * A noon time is added so the browser's time zone cannot shift the date to a different day.
 *
 * @param {string} isoDate - A date in YYYY-MM-DD format.
 * @param {Intl.DateTimeFormatOptions} [displayOptions] - How the date should look.
 * @returns {string} The formatted date, or "—" when no date was supplied.
 */
export function formatDate(
  isoDate,
  displayOptions = { month: "short", day: "numeric", year: "numeric" },
) {
  if (!isoDate) return "—";

  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(
    "en-US",
    displayOptions,
  );
}

/**
 * Shows a small pop-up message (a "toast") to the administrator.
 * dashboard.js listens for the "sbg:toast" event and displays the message.
 *
 * @param {string} message - The text to show.
 * @param {"success"|"error"} [messageType] - Controls the colour of the toast.
 */
export function showToastMessage(message, messageType = "success") {
  document.dispatchEvent(
    new CustomEvent("sbg:toast", { detail: { message, type: messageType } }),
  );
}

/**
 * Downloads a CSV (spreadsheet) file built from an array of rows.
 *
 * @param {string} fileName - Name of the downloaded file, for example "members.csv".
 * @param {Array<Array<*>>} tableRows - Each inner array is one row of cells.
 */
export function downloadCsvFile(fileName, tableRows) {
  // Wrap every cell in quotes and double any quotes inside it, as CSV requires.
  const quoteCell = (cellValue) =>
    `"${String(cellValue ?? "").replace(/"/g, '""')}"`;

  const csvText = tableRows
    .map((tableRow) => tableRow.map(quoteCell).join(","))
    .join("\r\n");

  // The leading "\ufeff" helps Excel read accented characters correctly.
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(
    new Blob(["\ufeff" + csvText], { type: "text/csv" }),
  );
  downloadLink.download = fileName;
  downloadLink.click();
  URL.revokeObjectURL(downloadLink.href);
}

/**
 * Returns the officers and events that dashboard.js has loaded from the API.
 * dashboard.js publishes them on window.__sbgData so the Overview, Reports and
 * Academic Years pages can read them without calling the API a second time.
 *
 * @returns {{events: object[], officers: object[]}} Empty lists until the data has loaded.
 */
export function getLoadedDashboardData() {
  return window.__sbgData ?? { events: [], officers: [] };
}
