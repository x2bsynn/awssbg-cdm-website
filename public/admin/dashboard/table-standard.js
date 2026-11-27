/*
  SHARED TABLE ENHANCER
  ---------------------
  Adds the same helpful controls to every data table in the dashboard:
    - a search box
    - sortable columns (click the arrows in a column header)
    - a filter for each column (click the funnel in a column header)
    - "Rows per page" (25 / 50 / 75 / 100, default 25) and page buttons

  How it fits with the rest of the app
    - dashboard.js, members.js, registrations.js and reports.js only draw the table
      rows. They do NOT slice rows into pages, because this file does that for all tables.
    - dashboard-shell.js calls enhanceAllTables() whenever the page changes, so new
      tables (for example inside a dialog) are enhanced automatically.
    - Many tables are redrawn when data is loaded, edited or refreshed. This file
      watches each table body and re-reads the rows whenever another file replaces
      them, so the search, sort, filters and page keep working with the new data.
*/

// ==========================================
// SETTINGS AND SMALL HELPERS
// ==========================================

// The choices shown in the "Rows per page" menu.
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100];
// How many rows each table shows until the administrator picks another size.
const DEFAULT_PAGE_SIZE = 25;
// Columns with these header names (for example the buttons column) get no sort/filter controls.
const NON_DATA_COLUMN_NAMES = ["actions"];

// Small icons drawn with SVG so no image files are needed.
const SORT_ICON_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8l4-4 4 4M16 16l-4 4-4-4"/></svg>';
const FILTER_ICON_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7v5l-4 2v-7z"/></svg>';
const PREVIOUS_ICON_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const NEXT_ICON_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

/**
 * Turns any value into plain text so string methods are always safe to call.
 *
 * @param {*} value - Anything, including null or undefined.
 * @returns {string} The value as text ("" when it was empty).
 */
function toText(value) {
  return String(value ?? "");
}

/**
 * Reads the visible text of one table cell.
 *
 * @param {HTMLTableRowElement} tableRow - The row to read from.
 * @param {number} columnIndex - Which cell of the row to read.
 * @returns {string} The cell text without extra spaces.
 */
function getCellText(tableRow, columnIndex) {
  return toText(tableRow.cells[columnIndex]?.textContent).trim();
}

/**
 * Checks whether a piece of text looks like a number (allows commas, %, and $).
 *
 * @param {*} value - The text to check.
 * @returns {boolean} True when the text can be sorted as a number.
 */
function looksLikeNumber(value) {
  const cleanedText = toText(value).replace(/[$,%]/g, "").trim();
  return /^[-+]?(?:\d[\d,]*(?:\.\d+)?|\.\d+)$/.test(cleanedText);
}

/**
 * Converts number-like text such as "1,250" or "85%" into a real number.
 *
 * @param {string} numberText - Text that passed looksLikeNumber().
 * @returns {number} The numeric value.
 */
function parseNumberText(numberText) {
  return Number(numberText.replace(/[$,%]/g, "").replace(/,/g, ""));
}

/**
 * Decides how a column should be sorted: as text, as a date, or as a number.
 * The decision uses the column heading and the values currently in the column.
 *
 * @param {string} headerText - The column heading.
 * @param {HTMLTableRowElement[]} dataRows - Every data row in the table.
 * @param {number} columnIndex - The column being examined.
 * @returns {"text"|"date"|"number"} The sorting style to use.
 */
function detectColumnType(headerText, dataRows, columnIndex) {
  const lowerCaseHeader = toText(headerText).toLowerCase();
  const columnValues = dataRows
    .map((tableRow) => getCellText(tableRow, columnIndex))
    .filter(Boolean);

  if (
    /date|time|period|birthday|registered|academic year|a\.y/.test(
      lowerCaseHeader,
    )
  ) {
    return "date";
  }

  const headerSuggestsNumber =
    /amount|total|count|officer|member|event|registration|renewal|rate|number|terms|offices/.test(
      lowerCaseHeader,
    );
  if (headerSuggestsNumber && columnValues.every(looksLikeNumber)) {
    return "number";
  }

  return "text";
}

// ==========================================
// FILTER POPOVER (ONE AT A TIME)
// ==========================================

// The filter box that is currently open (only one can be open at once).
let openFilterPopover = null;

/** Closes the open filter box, if there is one. */
function closeFilterPopover() {
  openFilterPopover?.remove();
  openFilterPopover = null;
}

// Clicking anywhere outside a filter box (or pressing Escape) closes it.
// This is registered ONCE here instead of once per table, which avoids a pile of duplicate listeners.
document.addEventListener("click", (clickEvent) => {
  const clickedInsideFilter =
    clickEvent.target.closest(".standard-filter-popover") ||
    clickEvent.target.closest(".standard-filter");
  if (!clickedInsideFilter) closeFilterPopover();
});
document.addEventListener("keydown", (keyboardEvent) => {
  if (keyboardEvent.key === "Escape") closeFilterPopover();
});
// A box positioned for the old scroll position would look detached, so close it instead.
window.addEventListener("scroll", closeFilterPopover, true);
window.addEventListener("resize", closeFilterPopover);

// ==========================================
// PAGE BUTTONS
// ==========================================

/**
 * Builds the list of page buttons to show, using "…" when there are many pages.
 * Example for page 5 of 20: [1, "…", 4, 5, 6, "…", 20].
 *
 * @param {number} currentPage - The page being viewed (starts at 1).
 * @param {number} pageCount - How many pages exist.
 * @returns {Array<number|string>} Page numbers and "…" separators.
 */
function buildPageButtonList(currentPage, pageCount) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, pageIndex) => pageIndex + 1);
  }

  const pagesToShow = new Set([
    1,
    pageCount,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  if (currentPage <= 3)
    [2, 3, 4].forEach((pageNumber) => pagesToShow.add(pageNumber));
  if (currentPage >= pageCount - 2) {
    [pageCount - 3, pageCount - 2, pageCount - 1].forEach((pageNumber) =>
      pagesToShow.add(pageNumber),
    );
  }

  const buttonList = [];
  let previousPageNumber = 0;
  [...pagesToShow]
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= pageCount)
    .sort((firstPage, secondPage) => firstPage - secondPage)
    .forEach((pageNumber) => {
      if (pageNumber - previousPageNumber > 1) buttonList.push("…");
      buttonList.push(pageNumber);
      previousPageNumber = pageNumber;
    });
  return buttonList;
}

// ==========================================
// ENHANCING ONE TABLE
// ==========================================

/**
 * Adds search, sorting, filters, page size and page buttons to one table.
 *
 * The table must sit inside an element with the class "table-wrap". It is safe to
 * call more than once: a table that was already enhanced is skipped.
 *
 * @param {HTMLTableElement} table - The table to enhance.
 */
export function enhanceTable(table) {
  if (!table || table.dataset.standardized === "true") return;

  const tableWrapper = table.closest(".table-wrap");
  const tableBody = table.querySelector("tbody");
  const headerCells = [...table.querySelectorAll("thead th")];
  if (!tableWrapper || !tableBody || !headerCells.length) return;

  table.dataset.standardized = "true";

  // Everything the administrator has chosen for THIS table.
  const tableState = {
    searchText: "",
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortColumnIndex: null,
    sortDirection: "asc",
    columnFilters: new Map(), // column index -> Set of allowed cell values
  };

  // The rows that hold real data. Placeholder rows such as "Loading..." or
  // "No results" carry the class "empty-cell" and are never treated as data.
  let dataRows = [];

  function readDataRowsFromTableBody() {
    return [...tableBody.children].filter(
      (tableRow) =>
        tableRow.matches("tr") && !tableRow.querySelector("td.empty-cell"),
    );
  }

  // ---------- search box ----------
  const searchToolbar = document.createElement("div");
  searchToolbar.className = "standard-table-toolbar";
  searchToolbar.innerHTML =
    '<label class="standard-table-search"><span>Search</span><input type="search" placeholder="Search table" aria-label="Search table"></label>';
  tableWrapper.parentElement?.insertBefore(searchToolbar, tableWrapper);

  // ---------- pager boxes (one above and one below the table) ----------
  const topPager = document.createElement("div");
  const bottomPager = document.createElement("div");
  topPager.className = "standard-table-pager";
  bottomPager.className = "standard-table-pager";

  /**
   * Applies the search text, the column filters and the sort order to the data rows.
   *
   * @returns {HTMLTableRowElement[]} The rows that should be shown, in order.
   */
  function getVisibleRows() {
    let matchingRows = [...dataRows];

    // 1. Search: keep rows whose text contains the search words.
    const searchText = tableState.searchText.trim().toLowerCase();
    if (searchText) {
      matchingRows = matchingRows.filter((tableRow) =>
        toText(tableRow.textContent).toLowerCase().includes(searchText),
      );
    }

    // 2. Column filters: keep rows whose cell value was ticked in the filter box.
    tableState.columnFilters.forEach((allowedValues, columnIndex) => {
      if (allowedValues.size) {
        matchingRows = matchingRows.filter((tableRow) =>
          allowedValues.has(getCellText(tableRow, columnIndex)),
        );
      }
    });

    // 3. Sorting: order rows by the chosen column, using the right comparison for its type.
    const sortIndex = tableState.sortColumnIndex;
    if (sortIndex !== null) {
      const columnType = detectColumnType(
        headerCells[sortIndex].textContent,
        dataRows,
        sortIndex,
      );
      matchingRows.sort((firstRow, secondRow) => {
        const firstValue = getCellText(firstRow, sortIndex);
        const secondValue = getCellText(secondRow, sortIndex);
        let comparisonResult;

        if (
          columnType === "number" &&
          looksLikeNumber(firstValue) &&
          looksLikeNumber(secondValue)
        ) {
          comparisonResult =
            parseNumberText(firstValue) - parseNumberText(secondValue);
        } else if (columnType === "date") {
          const firstTime = Date.parse(firstValue);
          const secondTime = Date.parse(secondValue);
          comparisonResult =
            Number.isNaN(firstTime) || Number.isNaN(secondTime)
              ? firstValue.localeCompare(secondValue)
              : firstTime - secondTime;
        } else {
          // "numeric: true" makes "item 2" come before "item 10".
          comparisonResult = firstValue.localeCompare(secondValue, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        return tableState.sortDirection === "asc"
          ? comparisonResult
          : -comparisonResult;
      });
    }
    return matchingRows;
  }

  /**
   * Draws one pager: record range, rows-per-page menu, and page buttons.
   *
   * @param {HTMLElement} pagerElement - The box to draw into.
   * @param {number} pageCount - Total pages for the current result list.
   * @param {number} recordCount - Total rows that match the search and filters.
   */
  function renderPager(pagerElement, pageCount, recordCount) {
    const firstRecordNumber = recordCount
      ? (tableState.currentPage - 1) * tableState.pageSize + 1
      : 0;
    const lastRecordNumber = Math.min(
      tableState.currentPage * tableState.pageSize,
      recordCount,
    );

    const pageButtons = buildPageButtonList(tableState.currentPage, pageCount)
      .map((pageItem) =>
        pageItem === "…"
          ? '<span class="standard-page-gap" aria-hidden="true">…</span>'
          : `<button type="button" class="standard-page-number${pageItem === tableState.currentPage ? " is-current" : ""}" data-page="${pageItem}" aria-label="Page ${pageItem}"${pageItem === tableState.currentPage ? ' aria-current="page"' : ""}>${pageItem}</button>`,
      )
      .join("");

    pagerElement.innerHTML =
      `<span class="standard-table-range">Showing <b>${firstRecordNumber}–${lastRecordNumber}</b> of <b>${recordCount}</b> records</span>` +
      `<span class="standard-page-size"><label>Rows per page</label><select aria-label="Rows per page">${PAGE_SIZE_OPTIONS.map((sizeOption) => `<option value="${sizeOption}"${sizeOption === tableState.pageSize ? " selected" : ""}>${sizeOption}</option>`).join("")}</select></span>` +
      `<span class="standard-page-controls">` +
      `<button type="button" class="standard-page-step" data-page="${tableState.currentPage - 1}" aria-label="Previous page"${tableState.currentPage <= 1 ? " disabled" : ""}>${PREVIOUS_ICON_SVG}<span></span></button>` +
      `<span class="standard-page-numbers">${pageButtons}</span>` +
      `<span class="standard-page-status">Page ${tableState.currentPage} of ${pageCount}</span>` +
      `<button type="button" class="standard-page-step" data-page="${tableState.currentPage + 1}" aria-label="Next page"${tableState.currentPage >= pageCount ? " disabled" : ""}><span></span>${NEXT_ICON_SVG}</button>` +
      `</span>`;
  }

  /**
   * Redraws the table body (only the current page of rows) and both pagers.
   * Called after every search, sort, filter, page change or data change.
   */
  function renderTable() {
    const visibleRows = getVisibleRows();
    const pageCount = Math.max(
      1,
      Math.ceil(visibleRows.length / tableState.pageSize),
    );
    tableState.currentPage = Math.min(tableState.currentPage, pageCount);

    // Leave placeholder messages (for example "Loading...") alone when there is no data at all.
    if (dataRows.length) {
      const firstRowOnPage = (tableState.currentPage - 1) * tableState.pageSize;
      tableBody.replaceChildren();

      if (visibleRows.length) {
        visibleRows
          .slice(firstRowOnPage, firstRowOnPage + tableState.pageSize)
          .forEach((tableRow) => tableBody.append(tableRow));
      } else {
        // No row matches the search or filters.
        const messageRow = document.createElement("tr");
        messageRow.innerHTML = `<td colspan="${headerCells.length}" class="empty-cell">No records match the active search or filters.</td>`;
        tableBody.append(messageRow);
      }
    }

    renderPager(topPager, pageCount, visibleRows.length);
    renderPager(bottomPager, pageCount, visibleRows.length);

    // We just changed the table body ourselves. Throw away the notes the observer
    // made about it, so it does not mistake our own change for new data.
    tableBodyObserver.takeRecords();
  }

  // ---------- reacting to data changes made by other files ----------
  // When dashboard.js, members.js, etc. replace the rows (after loading, saving or
  // deleting something), read the new rows and redraw, keeping search/sort/filters.
  const tableBodyObserver = new MutationObserver(() => {
    dataRows = readDataRowsFromTableBody();
    renderTable();
  });

  // ---------- events inside the pagers (handled once per pager) ----------
  [topPager, bottomPager].forEach((pagerElement) => {
    pagerElement.addEventListener("click", (clickEvent) => {
      const pageButton = clickEvent.target.closest("[data-page]");
      if (!pageButton || pageButton.disabled) return;
      tableState.currentPage = Number(pageButton.dataset.page);
      renderTable();
    });
    pagerElement.addEventListener("change", (changeEvent) => {
      if (!changeEvent.target.matches("select")) return;
      // A new page size starts again from page 1; search and filters stay active.
      tableState.pageSize = Number(changeEvent.target.value);
      tableState.currentPage = 1;
      renderTable();
    });
  });

  // ---------- search box ----------
  searchToolbar
    .querySelector("input")
    .addEventListener("input", (inputEvent) => {
      tableState.searchText = inputEvent.target.value;
      tableState.currentPage = 1;
      renderTable();
    });

  // ---------- column header controls ----------
  headerCells.forEach((headerCell, columnIndex) => {
    const headerText = toText(headerCell.textContent).trim();
    if (!headerText || NON_DATA_COLUMN_NAMES.includes(headerText.toLowerCase()))
      return;

    const originalHeaderHtml = headerCell.innerHTML;
    headerCell.classList.add("standard-sortable");
    headerCell.innerHTML =
      `<span class="standard-header-label">${originalHeaderHtml}</span>` +
      `<span class="standard-header-actions">` +
      `<button type="button" class="standard-sort" aria-label="Sort by ${headerText}">${SORT_ICON_SVG}</button>` +
      `<button type="button" class="standard-filter" aria-label="Filter ${headerText}">${FILTER_ICON_SVG}</button>` +
      `</span>`;

    // Sort button: first click = ascending, second click = descending.
    headerCell.querySelector(".standard-sort").addEventListener("click", () => {
      if (tableState.sortColumnIndex === columnIndex) {
        tableState.sortDirection =
          tableState.sortDirection === "asc" ? "desc" : "asc";
      } else {
        tableState.sortColumnIndex = columnIndex;
        tableState.sortDirection = "asc";
      }
      headerCells.forEach((otherHeader) =>
        otherHeader.removeAttribute("aria-sort"),
      );
      headerCell.setAttribute(
        "aria-sort",
        tableState.sortDirection === "asc" ? "ascending" : "descending",
      );
      headerCells.forEach((otherHeader) =>
        otherHeader.removeAttribute("data-sort"),
      );
      headerCell.dataset.sort = tableState.sortDirection;
      tableState.currentPage = 1;
      renderTable();
    });

    // Filter button: opens a small box listing every value in the column.
    headerCell
      .querySelector(".standard-filter")
      .addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        closeFilterPopover();

        const distinctValues = [
          ...new Set(
            dataRows
              .map((tableRow) => getCellText(tableRow, columnIndex))
              .filter(Boolean),
          ),
        ].sort((firstValue, secondValue) =>
          firstValue.localeCompare(secondValue, undefined, { numeric: true }),
        );
        const alreadySelected =
          tableState.columnFilters.get(columnIndex) ?? new Set();

        const filterPopover = document.createElement("div");
        filterPopover.className = "standard-filter-popover";
        filterPopover.innerHTML =
          `<strong>Filter ${headerText}</strong>` +
          `<div class="standard-filter-options">${distinctValues
            .map(
              (valueText) =>
                `<label><input type="checkbox" value="${valueText.replace(/"/g, "&quot;")}"${alreadySelected.has(valueText) ? " checked" : ""}><span>${valueText.replace(/</g, "&lt;")}</span></label>`,
            )
            .join("")}</div>` +
          '<div class="standard-filter-actions"><button type="button" data-clear>Clear</button><button type="button" data-close>Done</button></div>';
        document.body.append(filterPopover);
        openFilterPopover = filterPopover;

        // Place the box under the header, kept inside the visible screen area.
        const headerBox = headerCell.getBoundingClientRect();
        const popoverWidth = Math.min(260, window.innerWidth - 16);
        filterPopover.style.left = `${Math.max(8, Math.min(window.innerWidth - popoverWidth - 8, headerBox.left))}px`;
        filterPopover.style.top = `${Math.max(8, headerBox.bottom + 8)}px`;

        filterPopover.querySelectorAll("input").forEach((checkbox) =>
          checkbox.addEventListener("change", () => {
            const ticked = new Set(
              [...filterPopover.querySelectorAll("input:checked")].map(
                (box) => box.value,
              ),
            );
            if (ticked.size) tableState.columnFilters.set(columnIndex, ticked);
            else tableState.columnFilters.delete(columnIndex);
            headerCell.classList.toggle("has-filter", ticked.size > 0);
            tableState.currentPage = 1;
            renderTable();
          }),
        );
        filterPopover
          .querySelector("[data-clear]")
          .addEventListener("click", () => {
            tableState.columnFilters.delete(columnIndex);
            filterPopover
              .querySelectorAll("input")
              .forEach((checkbox) => (checkbox.checked = false));
            headerCell.classList.remove("has-filter");
            tableState.currentPage = 1;
            renderTable();
          });
        filterPopover
          .querySelector("[data-close]")
          .addEventListener("click", closeFilterPopover);
      });
  });

  // ---------- first draw ----------

  // Keep the top pager outside the horizontally scrollable table.
  tableWrapper.parentElement.insertBefore(topPager, tableWrapper);

  // Keep the bottom pager outside the horizontally scrollable table.
  tableWrapper.parentElement.insertBefore(
    bottomPager,
    tableWrapper.nextSibling,
  );
  dataRows = readDataRowsFromTableBody();
  renderTable();
  tableBodyObserver.observe(tableBody, { childList: true });
}

/**
 * Finds every table under `rootElement` and enhances it.
 * Safe to call repeatedly: tables already enhanced are skipped.
 *
 * @param {ParentNode} [rootElement] - Where to look (defaults to the whole page).
 */
export function enhanceAllTables(rootElement = document) {
  rootElement.querySelectorAll("table").forEach((table) => enhanceTable(table));
}
