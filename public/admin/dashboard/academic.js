/*
  Academic-year records.

  This module does two jobs:
    1. It lists every academic year that has any data, and finds the events that
       belong to a year. reports.js uses these helpers for its year-by-year charts.
    2. It can draw an "Academic Years" summary table into the hidden
       #academic-view section. The dashboard has no menu entry for that page right
       now, because the year picker in the top bar and the Reports page already
       cover it, so the drawing code only runs if some page chooses to show it.

  It only READS data. The current academic year is always detected automatically
  by ay.js; nothing here changes it.
*/
import {
  getCurrentAcademicYear,
  academicYearSelection,
  formatAcademicYearLabel,
  getAcademicYearDateRange,
  getAcademicYearOfDate,
  getOfficerSeatsForAcademicYear,
  getAcademicYearChoices,
} from "./ay.js";
import { getMembershipStatistics } from "./members.js";
import { getRegistrationStatistics } from "./registrations.js";
import { formatDate, getLoadedDashboardData } from "./utilities.js";

// ==========================================
// FINDING ACADEMIC YEARS AND THEIR EVENTS
// ==========================================

/**
 * Lists every academic year that has any data, newest first.
 * It combines the standard year choices, the years named in officer positions,
 * and the years in which events took place.
 *
 * @returns {string[]} For example ["2026-2027", "2025-2026"].
 */
export function getAcademicYearsWithRecords() {
  const { events, officers } = getLoadedDashboardData();
  const academicYears = new Set([getCurrentAcademicYear()]);

  getAcademicYearChoices().forEach((academicYear) => academicYears.add(academicYear));

  officers.forEach((officer) =>
    (officer.positions ?? []).forEach((position) => {
      if (position.year) academicYears.add(position.year);
    }),
  );

  events.forEach((eventRecord) => {
    if (eventRecord.date) academicYears.add(getAcademicYearOfDate(eventRecord.date));
  });

  return [...academicYears].sort().reverse();
}

/**
 * Returns the events whose date falls inside one academic year.
 *
 * @param {string} academicYear - For example "2026-2027".
 * @returns {object[]} Event records.
 */
export function getEventsInAcademicYear(academicYear) {
  return getLoadedDashboardData().events.filter(
    (eventRecord) =>
      eventRecord.date && getAcademicYearOfDate(eventRecord.date) === academicYear,
  );
}

// ==========================================
// OPTIONAL "ACADEMIC YEARS" PAGE
// ==========================================

/**
 * Draws the Academic Years summary into #academic-view (only if it is visible).
 * One table row per year with officers, active members, renewals, events and registrations.
 */
export function renderAcademicYearsPage() {
  const academicView = document.getElementById("academic-view");
  if (!academicView || academicView.hidden) return;

  const currentAcademicYear = getCurrentAcademicYear();
  const currentYearRange = getAcademicYearDateRange(currentAcademicYear);
  const { officers } = getLoadedDashboardData();

  const tableRowsHtml = getAcademicYearsWithRecords()
    .map((academicYear) => {
      const memberStatistics = getMembershipStatistics(academicYear);
      const eventsInYear = getEventsInAcademicYear(academicYear);
      const registrationStatistics = getRegistrationStatistics(eventsInYear);
      const yearRange = getAcademicYearDateRange(academicYear);

      // Count each officer once, even if they hold several positions in the year.
      const officerCount = new Set(
        getOfficerSeatsForAcademicYear(officers, academicYear)
          .filter((seat) => !seat.isAdviser)
          .map((seat) => seat.officer.id),
      ).size;

      const isSelectedYear = academicYear === academicYearSelection.selected;
      const currentYearBadge =
        academicYear === currentAcademicYear
          ? ' <span class="ms ms-active">Current</span>'
          : "";
      const renewalRateText =
        memberStatistics.renewalRate == null ? "—" : `${memberStatistics.renewalRate}%`;

      return `<tr class="${isSelectedYear ? "is-sel" : ""}">
        <td data-label="Academic year"><strong>${formatAcademicYearLabel(academicYear)}</strong>${currentYearBadge}</td>
        <td data-label="Period">${formatDate(yearRange.start)} – ${formatDate(yearRange.end)}</td>
        <td data-label="Officers">${officerCount}</td>
        <td data-label="Active members">${memberStatistics.active}</td>
        <td data-label="Renewal rate">${renewalRateText}</td>
        <td data-label="Events">${eventsInYear.length}</td>
        <td data-label="Registrations">${registrationStatistics.total}</td>
        <td data-label="Actions"><span class="row-actions">
          <button class="button button-light" data-academic-year="${academicYear}" data-target-view="structure">Officers</button>
          <button class="button button-light" data-academic-year="${academicYear}" data-target-view="members">Members</button>
          <button class="button button-light" data-academic-year="${academicYear}" data-target-view="reports">Report</button>
        </span></td></tr>`;
    })
    .join("");

  academicView.innerHTML = `<div class="page-head"><div><div class="eyebrow">Academic records</div><h1>Academic Years</h1>
    <p class="subtitle">Every record belongs to an academic year. Switching years never deletes or overwrites history.</p></div></div>
    <div class="ay-hero"><div><span class="mono-label">Active now · detected automatically (Asia/Manila)</span><strong class="ov-big">${formatAcademicYearLabel(currentAcademicYear)}</strong></div>
      <p>${formatDate(currentYearRange.start)} – ${formatDate(currentYearRange.end)}<br>The next year begins on August 1 with no manual change.</p></div>
    <div class="table-wrap"><table class="m-table ay-table"><thead><tr><th>Academic year</th><th>Period</th><th>Officers</th><th>Active members</th><th>Renewal rate</th><th>Events</th><th>Registrations</th><th>Actions</th></tr></thead><tbody>${tableRowsHtml}</tbody></table></div>
    <p class="empty-line">Member and registration figures come from sample data; officers and events come from your saved records.</p>`;
}

// ==========================================
// EVENT LISTENERS
// ==========================================

// A row button picks that academic year and then opens the chosen page.
// dashboard-shell.js listens for "sbg:setay" (change year) and "sbg:go" (change page).
document.addEventListener("click", (clickEvent) => {
  const rowButton = clickEvent.target.closest("[data-academic-year][data-target-view]");
  if (!rowButton) return;

  document.dispatchEvent(
    new CustomEvent("sbg:setay", { detail: rowButton.dataset.academicYear }),
  );
  document.dispatchEvent(
    new CustomEvent("sbg:go", { detail: rowButton.dataset.targetView }),
  );
});

// Redraw whenever the data, the selected year or the visible page changes.
// setTimeout lets the page finish switching before the table is drawn.
["sbg:data", "sbg:ay", "sbg:navigate"].forEach((eventName) =>
  document.addEventListener(eventName, () => setTimeout(renderAcademicYearsPage)),
);
