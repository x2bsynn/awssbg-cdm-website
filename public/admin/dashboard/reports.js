/*
  REPORTS & ANALYTICS PAGE
  ------------------------
  Builds the "Reports & Analytics" page for the academic year chosen in the top bar.
  It combines four data sources:
    - members.js        -> membership numbers (active, inactive, renewal rate, ...)
    - registrations.js  -> event registration numbers
    - officers + events -> loaded by dashboard.js (read through utilities.js)
    - academic.js       -> the list of academic years that have records

  Every chart is drawn as HTML or SVG and takes its colours from CSS variables in
  dashboard-theme.css, so the charts follow the light/dark theme automatically.
  The page can be printed or downloaded as a CSV file.
*/
import {
  academicYearSelection,
  formatAcademicYearLabel,
  getOfficerSeatsForAcademicYear,
  OFFICE_ORDER,
  getPositionTitleRank,
} from "./ay.js";
import { getMembershipStatistics, getMembers } from "./members.js";
import { getRegistrationStatistics } from "./registrations.js";
import { getAcademicYearsWithRecords, getEventsInAcademicYear } from "./academic.js";
import {
  escapeHtml,
  getElementById,
  getLoadedDashboardData,
  downloadCsvFile,
} from "./utilities.js";

// ==========================================
// SETTINGS
// ==========================================

// Offices shown in the "Officers per office" chart, in the fixed organization order.
const REPORT_OFFICE_NAMES = OFFICE_ORDER;

// Number of CSS colour slots available for donut-chart segments (see .donut-segment-N in the CSS).
const DONUT_COLOR_SLOT_COUNT = 5;

// Rows collected while the page is drawn; they become the CSV download.
const csvExportRows = [];

/**
 * Remembers one value so it appears in the CSV download.
 *
 * @param {string} sectionName - The report section, for example "Program".
 * @param {string} rowLabel - The label of the value.
 * @param {*} rowValue - The number or text.
 */
function addCsvRow(sectionName, rowLabel, rowValue) {
  csvExportRows.push([sectionName, rowLabel, rowValue]);
}

// ==========================================
// CHART BUILDERS
// ==========================================

/**
 * Builds horizontal bars, one per item. The longest bar fills the row.
 *
 * @param {string} sectionName - Name used in the CSV download.
 * @param {Array<[string, number]>} labelValuePairs - [label, number] for every bar.
 * @returns {string} HTML for the bars.
 */
function buildHorizontalBars(sectionName, labelValuePairs) {
  // Never divide by zero when every value is 0.
  const largestValue = Math.max(1, ...labelValuePairs.map(([, itemValue]) => itemValue));

  return (
    labelValuePairs
      .map(([itemLabel, itemValue]) => {
        addCsvRow(sectionName, itemLabel, itemValue);
        const widthPercent = (itemValue / largestValue) * 100;
        return `<div class="bar-row${itemValue ? "" : " vacant"}" data-tip="${escapeHtml(itemLabel)}: ${itemValue}"><span>${escapeHtml(itemLabel)}</span><div><b style="width:${widthPercent}%"></b></div><em>${itemValue}</em></div>`;
      })
      .join("") || '<p class="empty-line">No data.</p>'
  );
}

/**
 * Builds a donut chart with a legend that shows each value and its percentage.
 *
 * @param {string} sectionName - Name used in the CSV download and for screen readers.
 * @param {Array<[string, number]>} labelValuePairs - [label, number] for every segment.
 * @returns {string} HTML/SVG for the chart.
 */
function buildDonutChart(sectionName, labelValuePairs) {
  const totalValue = labelValuePairs.reduce((runningTotal, [, itemValue]) => runningTotal + itemValue, 0);
  labelValuePairs.forEach(([itemLabel, itemValue]) => addCsvRow(sectionName, itemLabel, itemValue));
  if (!totalValue) return '<p class="empty-line">No data yet.</p>';

  // Each segment is a circle outline; "dasharray" draws only its share and "dashoffset" moves it
  // past the segments already drawn. The circle has a circumference of about 100, so values are percentages.
  let offsetSoFar = 0;
  const circleSegments = labelValuePairs
    .map(([itemLabel, itemValue], segmentIndex) => {
      const segmentPercent = (itemValue / totalValue) * 100;
      const segmentSvg = itemValue
        ? `<circle class="donut-segment donut-segment-${segmentIndex % DONUT_COLOR_SLOT_COUNT}" r="15.9" cx="21" cy="21" fill="none" stroke-width="5.5" stroke-dasharray="${segmentPercent} ${100 - segmentPercent}" stroke-dashoffset="${-offsetSoFar}" transform="rotate(-90 21 21)"><title>${escapeHtml(itemLabel)}: ${itemValue}</title></circle>`
        : "";
      offsetSoFar += segmentPercent;
      return segmentSvg;
    })
    .join("");

  const legendItems = labelValuePairs
    .map(
      ([itemLabel, itemValue], segmentIndex) =>
        `<li><i class="donut-swatch donut-segment-${segmentIndex % DONUT_COLOR_SLOT_COUNT}"></i>${escapeHtml(itemLabel)} <b>${itemValue}</b> <small>${Math.round((itemValue / totalValue) * 100)}%</small></li>`,
    )
    .join("");

  return `<div class="donut"><div class="donut-fig"><svg viewBox="0 0 42 42" role="img" aria-label="${escapeHtml(sectionName)}">${circleSegments}</svg><span><b>${totalValue}</b>total</span></div><ul>${legendItems}</ul></div>`;
}

/**
 * Builds a line chart with grid lines, a labelled y-axis and one labelled point per academic year.
 *
 * @param {string} sectionName - Name used in the CSV download and for screen readers.
 * @param {Array<{label: string, value: (number|null)}>} chartPoints - One point per academic year.
 *   A null value means "no data for that year": the point is skipped.
 * @param {string} [valueSuffix] - Text added after each number, for example "%".
 * @returns {string} SVG markup.
 */
function buildLineChart(sectionName, chartPoints, valueSuffix = "") {
  // Fixed drawing area (the SVG scales to its container) and the space kept free around the plot.
  const chartWidth = 360;
  const chartHeight = 190;
  const margin = { left: 34, right: 14, top: 16, bottom: 30 };

  // Percentages always use a 0-100 scale; other charts round the top value up to a multiple of 4
  // so the four grid-line gaps are whole numbers.
  const highestValue = Math.max(1, ...chartPoints.map((chartPoint) => chartPoint.value ?? 0));
  const axisMaximum = valueSuffix === "%" ? 100 : Math.ceil(highestValue / 4) * 4 || 4;

  // Convert a point's position in the list / its value into an x / y position in the SVG.
  const getX = (pointIndex) =>
    margin.left + (pointIndex * (chartWidth - margin.left - margin.right)) / Math.max(1, chartPoints.length - 1);
  const getY = (pointValue) =>
    margin.top + (1 - pointValue / axisMaximum) * (chartHeight - margin.top - margin.bottom);

  chartPoints.forEach((chartPoint) => addCsvRow(sectionName, chartPoint.label, chartPoint.value ?? ""));

  const drawablePoints = chartPoints
    .map((chartPoint, pointIndex) =>
      chartPoint.value == null ? null : { x: getX(pointIndex), y: getY(chartPoint.value), chartPoint },
    )
    .filter(Boolean);

  const gridValues = [0, 1, 2, 3, 4].map((gridStep) => (axisMaximum / 4) * gridStep);
  const gridLinesAndAxisLabels = gridValues
    .map(
      (gridValue) =>
        `<line x1="${margin.left}" x2="${chartWidth - margin.right}" y1="${getY(gridValue)}" y2="${getY(gridValue)}" class="grid"/><text x="${margin.left - 6}" y="${getY(gridValue) + 3}" text-anchor="end" class="ax">${Math.round(gridValue)}${valueSuffix}</text>`,
    )
    .join("");

  // A soft filled area under the line makes the trend easier to read.
  const areaUnderLine =
    drawablePoints.length > 1
      ? `<path class="chart-area" d="M${drawablePoints[0].x},${getY(0)} L${drawablePoints.map((point) => `${point.x},${point.y}`).join(" L")} L${drawablePoints.at(-1).x},${getY(0)} Z"/>`
      : "";

  const linePath = `<polyline class="chart-line" fill="none" stroke-width="2.5" stroke-linejoin="round" points="${drawablePoints.map((point) => `${point.x},${point.y}`).join(" ")}"/>`;
  const pointDotsAndValues = drawablePoints
    .map(
      ({ x, y, chartPoint }) =>
        `<circle cx="${x}" cy="${y}" r="4.5" class="dot"><title>${escapeHtml(formatAcademicYearLabel(chartPoint.label))}: ${chartPoint.value}${valueSuffix}</title></circle><text x="${x}" y="${y - 9}" text-anchor="middle" class="val">${chartPoint.value}${valueSuffix}</text>`,
    )
    .join("");
  // Short year labels such as "25–26" keep the x-axis readable on phones.
  const xAxisLabels = chartPoints
    .map(
      (chartPoint, pointIndex) =>
        `<text x="${getX(pointIndex)}" y="${chartHeight - 9}" text-anchor="middle" class="ax">${chartPoint.label.slice(2, 4)}–${chartPoint.label.slice(7)}</text>`,
    )
    .join("");

  return `<svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="linechart" role="img" aria-label="${escapeHtml(sectionName)}">${gridLinesAndAxisLabels}${areaUnderLine}${linePath}${pointDotsAndValues}${xAxisLabels}</svg>`;
}

/**
 * Builds the "events per month" column chart for one academic year.
 * Months run August -> July and use three-letter names (Aug, Sep, ...).
 *
 * @param {string} sectionName - Name used in the CSV download.
 * @param {Array<[string, number]>} monthCounts - [three-letter month, number of events] for 12 months.
 * @returns {string} HTML for the chart.
 */
function buildMonthlyColumnChart(sectionName, monthCounts) {
  const largestCount = Math.max(1, ...monthCounts.map(([, eventCount]) => eventCount));
  const columns = monthCounts
    .map(([monthName, eventCount]) => {
      addCsvRow(sectionName, monthName, eventCount);
      return `<div data-tip="${monthName}: ${eventCount} event${eventCount === 1 ? "" : "s"}"><b style="--v:${eventCount / largestCount}" data-n="${eventCount || ""}"></b><i>${monthName}</i></div>`;
    })
    .join("");
  return `<div class="months">${columns}</div>`;
}

// ==========================================
// DATA PREPARATION
// ==========================================

/**
 * Counts how many items fall into each group.
 *
 * @param {object[]} itemList - The items to count.
 * @param {(item: object) => string} getGroupName - Returns the group an item belongs to.
 * @returns {Array<[string, number]>} [group name, count] pairs.
 */
function countByGroup(itemList, getGroupName) {
  const countsByGroup = {};
  itemList.forEach((item) => {
    const groupName = getGroupName(item);
    countsByGroup[groupName] = (countsByGroup[groupName] ?? 0) + 1;
  });
  return Object.entries(countsByGroup);
}

/**
 * Counts events in each month of an academic year (August to July).
 *
 * @param {object[]} eventsInYear - Events that belong to the academic year.
 * @param {string} academicYear - For example "2026-2027".
 * @returns {Array<[string, number]>} Twelve [month name, count] pairs in academic-year order.
 */
function countEventsPerMonth(eventsInYear, academicYear) {
  return Array.from({ length: 12 }, (_unusedItem, monthOffset) => {
    // monthOffset 0 = August (month 8) ... 11 = July (month 7).
    const calendarMonth = ((7 + monthOffset) % 12) + 1;
    // January-July belong to the second calendar year of the academic year.
    const calendarYear = Number(academicYear.slice(0, 4)) + (calendarMonth < 8 ? 1 : 0);
    const monthKey = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}`;
    const shortMonthName = new Date(`${monthKey}-01T12:00:00`).toLocaleDateString("en-US", { month: "short" });
    return [shortMonthName, eventsInYear.filter((eventRecord) => eventRecord.date.startsWith(monthKey)).length];
  });
}

// ==========================================
// PAGE RENDERING
// ==========================================

/**
 * Draws the whole Reports & Analytics page.
 * Does nothing while the page is hidden, so it costs nothing on other pages.
 */
export function renderReports() {
  const reportsView = getElementById("reports-view");
  if (!reportsView || reportsView.hidden) return;

  // Start the CSV list again so repeated drawing does not duplicate rows.
  csvExportRows.length = 0;

  const selectedAcademicYear = academicYearSelection.selected;
  const { officers: officerRecords } = getLoadedDashboardData();
  const memberStatistics = getMembershipStatistics(selectedAcademicYear);
  const eventsInYear = getEventsInAcademicYear(selectedAcademicYear);
  const registrationStatistics = getRegistrationStatistics(eventsInYear);

  // Members who renewed for the selected year are "Active".
  const activeMembers = getMembers().filter((member) =>
    member.records.some(
      (renewalRecord) => renewalRecord.ay === selectedAcademicYear && renewalRecord.status === "renewed",
    ),
  );

  // Oldest year first, so the line charts read from left (past) to right (present).
  const academicYearsOldestFirst = getAcademicYearsWithRecords().slice().reverse();

  // Officers: unique people per office for the selected year (advisers excluded).
  const studentOfficerSeats = getOfficerSeatsForAcademicYear(officerRecords, selectedAcademicYear).filter(
    (seat) => !seat.isAdviser,
  );
  const officerCountsByOffice = REPORT_OFFICE_NAMES.map((officeName) => [
    officeName,
    new Set(studentOfficerSeats.filter((seat) => seat.position.office === officeName).map((seat) => seat.officer.id)).size,
  ]);

  // Every published assignment of every year, with Director first, then Assistant Director, then the rest.
  const assignmentHistory = officerRecords
    .filter((officer) => officer.status === "published")
    .flatMap((officer) =>
      (officer.positions ?? []).filter((position) => position.year).map((position) => ({ name: officer.name, ...position })),
    )
    .sort(
      (firstAssignment, secondAssignment) =>
        secondAssignment.year.localeCompare(firstAssignment.year) ||
        OFFICE_ORDER.indexOf(firstAssignment.office) - OFFICE_ORDER.indexOf(secondAssignment.office) ||
        getPositionTitleRank(firstAssignment.title) - getPositionTitleRank(secondAssignment.title) ||
        String(firstAssignment.name).localeCompare(String(secondAssignment.name)),
    );

  const assignmentRows =
    assignmentHistory
      .map((assignment) => {
        addCsvRow("Assignments", `${assignment.year} ${assignment.office} ${assignment.title}`, assignment.name);
        return `<tr><td data-label="A.Y.">${escapeHtml(assignment.year)}</td><td data-label="Office">${escapeHtml(assignment.office)}</td><td data-label="Position">${escapeHtml(assignment.title)}</td><td data-label="Officer">${escapeHtml(assignment.name)}</td></tr>`;
      })
      .join("") || '<tr><td colspan="4" class="empty-cell">No published assignments.</td></tr>';

  const vacantOfficeNames = officerCountsByOffice.filter(([, officerCount]) => !officerCount).map(([officeName]) => officeName);

  const retentionNote =
    memberStatistics.renewalRate == null
      ? "No previous year to compare."
      : `Retention: ${memberStatistics.renewalRate}% of last year's active members renewed.`;
  const participationRateText = memberStatistics.active
    ? `${Math.round((registrationStatistics.uniqueParticipants / memberStatistics.active) * 100)}% of active members`
    : "n/a";

  reportsView.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Analytics</div>
        <h1>Reports &amp; Analytics</h1>
        <p class="subtitle">${formatAcademicYearLabel(selectedAcademicYear)} · change the year from the top bar. Member and registration figures use sample data.</p>
      </div>
      <div class="m-actions no-print">
        <button class="button button-light" id="rp-print"><i data-icon="printer"></i> Print</button>
        <button class="button button-primary" id="rp-csv"><i data-icon="download"></i> Download CSV</button>
      </div>
    </div>

    <h2 class="rp-h">Membership</h2>
    <div class="rp-grid">
      <section class="chart-card"><h3>Active members per academic year</h3>${buildLineChart("Active members per A.Y.", academicYearsOldestFirst.map((academicYear) => ({ label: academicYear, value: getMembershipStatistics(academicYear).active })))}</section>
      <section class="chart-card"><h3>Renewal rate per academic year</h3>${buildLineChart("Renewal rate per A.Y. (%)", academicYearsOldestFirst.map((academicYear) => ({ label: academicYear, value: getMembershipStatistics(academicYear).renewalRate })), "%")}</section>
      <section class="chart-card"><h3>Active vs inactive</h3>${buildDonutChart("Membership status", [["Active", memberStatistics.active], ["Inactive", memberStatistics.inactive]])}</section>
      <section class="chart-card"><h3>New vs returning (active)</h3>${buildHorizontalBars("New vs returning", [["New", memberStatistics.newMemberCount], ["Returning", memberStatistics.returning]])}<p class="chart-note">${retentionNote}</p></section>
      <section class="chart-card"><h3>By program (active)</h3>${buildHorizontalBars("Program", countByGroup(activeMembers, (member) => member.program).sort((firstGroup, secondGroup) => secondGroup[1] - firstGroup[1]))}</section>
      <section class="chart-card"><h3>By year level (active)</h3>${buildHorizontalBars("Year level", countByGroup(activeMembers, (member) => member.yearLevel).sort())}</section>
    </div>

    <h2 class="rp-h">Officers</h2>
    <div class="rp-grid">
      <section class="chart-card"><h3>Officers per office</h3>${buildHorizontalBars("Officers per office", officerCountsByOffice)}<p class="chart-note">Vacant offices: ${vacantOfficeNames.join(", ") || "none"}</p></section>
      <section class="chart-card chart-card-wide"><h3>Historical assignments</h3><div class="table-wrap rp-scroll"><table class="m-table"><thead><tr><th>A.Y.</th><th>Office</th><th>Position</th><th>Officer</th></tr></thead><tbody>${assignmentRows}</tbody></table></div></section>
    </div>

    <h2 class="rp-h">Events</h2>
    <div class="rp-grid">
      <section class="chart-card"><h3>Events per month</h3>${buildMonthlyColumnChart("Events per month", countEventsPerMonth(eventsInYear, selectedAcademicYear))}</section>
      <section class="chart-card"><h3>Registration status</h3>${buildDonutChart("Registration status", [["Confirmed", registrationStatistics.confirmed], ["Pending", registrationStatistics.pending], ["Cancelled", registrationStatistics.cancelled]])}</section>
      <section class="chart-card"><h3>Confirmed registrations per event</h3>${buildHorizontalBars("Registrations per event", registrationStatistics.perEvent.slice(0, 8).map((eventSummary) => [eventSummary.title, eventSummary.confirmedCount]))}</section>
      <section class="chart-card"><h3>Participation</h3>${buildHorizontalBars("Participation", [["Unique participants", registrationStatistics.uniqueParticipants], ["In 2+ events", registrationStatistics.multiEventParticipants], ["Registrations", registrationStatistics.total]])}<p class="chart-note">Participation rate: ${participationRateText}. These are registrations, not attendance (attendance is not tracked).</p></section>
    </div>`;
}

// ==========================================
// PRINT, CSV DOWNLOAD AND REFRESH
// ==========================================

// The Print and Download buttons are created each time the page is drawn, so one
// listener on the whole document handles them (event delegation).
document.addEventListener("click", (clickEvent) => {
  if (clickEvent.target.closest("#rp-print")) {
    window.print();
  }
  if (clickEvent.target.closest("#rp-csv")) {
    downloadCsvFile(`report-${academicYearSelection.selected}.csv`, [
      ["Section", "Label", "Value"],
      ...csvExportRows,
    ]);
  }
});

// Redraw whenever the data, the selected year or the visible page changes.
// "setTimeout" waits one moment so dashboard.js has finished showing/hiding sections first.
["sbg:data", "sbg:ay", "sbg:navigate"].forEach((eventName) =>
  document.addEventListener(eventName, () => setTimeout(renderReports)),
);
