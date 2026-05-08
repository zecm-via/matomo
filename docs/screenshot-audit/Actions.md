# Actions

## Screenshot Tests Found
- `plugins/Actions/tests/UI/ActionsDataTable_spec.js`

## Grouping By Rendered Component Region

### Actions data table — base widget render
- `ActionsDataTable_initial`: `keep`
  Rationale: Single full-page baseline of the Actions PageUrls data table widget (header row, label/column cells, toolbar, footer). This is the one representative visual snapshot of the plugin-owned table render and is genuinely visual (column layout, label truncation, toolbar styling). All later variants are state changes against this same region.
  Proposed assertion strategy: N/A

### Actions data table — sort, subtable, flatten, exclude-low-pop variants
- `ActionsDataTable_column_sorted`: `replace`
  Rationale: Verifies that clicking a column header re-sorts the table. Sort outcome is an ordering/state assertion, not a visual one; the styling is already covered by `initial`.
  Proposed assertion strategy: After clicking `th#avg_time_on_page`, assert the header has the active-sort class (e.g. `.sortable.column.activeIcon` / `aria-sort`) and that the first data row's avg-time cell value is the largest/smallest expected value (or that label-cell order matches an explicit array).
- `ActionsDataTable_subtables_loaded`: `replace`
  Rationale: Verifies that clicking subtable rows expands them. The interesting state is "subtable rows are now in the DOM under their parents", which DOM/text checks cover.
  Proposed assertion strategy: After clicks, assert `tr.subDataTable.expanded` count is 2 and that the expected child labels appear immediately after their parent rows (e.g. via `page.$$eval('tr.subDataTable-X td.label', ...)`).
- `ActionsDataTable_flattened`: `replace`
  Rationale: Flatten changes URL state (`flat=1`) and produces full-path labels. This is a behaviour/content assertion, not a styling check.
  Proposed assertion strategy: Assert the URL/flat flag is set on the report iframe and that at least one label cell text contains a `/` path segment that only appears in flattened mode (e.g. `blog/index`).
- `ActionsDataTable_exclude_low_population`: `replace`
  Rationale: Filter reduces the row count; layout/styling identical to `initial`.
  Proposed assertion strategy: Assert the data rows count after clicking the option is less than the unfiltered count, and that the "exclude low population" config item appears active.
- `ActionsDataTable_unflattened`: `remove`
  Rationale: After re-toggling flatten off the table returns to the same render as `initial` (same region, no distinct visual variant). Behaviour is already implied by the inverse of `flattened`.
  Proposed assertion strategy: N/A — covered by a small behavioural assertion in the flatten test (e.g. assert flat flag is now off / first row label no longer contains the flattened-only path) rather than a separate test/screenshot.

### Data table configuration dropdown panel (`.tableConfiguration`)
- `ActionsDataTable_configuration_options`: `replace`
  Rationale: Element-only screenshot (259x210) of the dropdown menu. Coverage is essentially a list of menu items and their labels; nothing visually distinctive that DOM checks would not credibly cover.
  Proposed assertion strategy: After clicking `.dropdownConfigureIcon`, assert `.tableConfiguration` is visible and list its expected menu item selectors/labels (`.dataTableFlatten`, `.dataTableExcludeLowPopulation`, plus any export/limit items) match the expected set.

### Column hover percentage tooltip
- `ActionsDataTable_pageview_percentages`: `replace`
  Rationale: Hovering a column cell shows a tooltip with the percentage. The visible state is a tooltip with text — text/visibility assertion is sufficient.
  Proposed assertion strategy: On hover, assert the tooltip element is visible and its text matches the expected `XX.X%` for the targeted row.
- `ActionsDataTable_unique_pageview_percentages`: `remove`
  Rationale: Same component region (column-hover percentage tooltip), just on a different column. Adds no distinct visual coverage beyond `pageview_percentages`.
  Proposed assertion strategy: N/A — covered by the same hover tooltip assertion pattern; if the unique-pageviews column needs explicit coverage, do it as a behavioural assertion (tooltip text on `td.column:eq(2)`) without a screenshot.

### Segmented visitor log row hover
- `ActionsDataTable_segmented_visitor_log_hover`: `replace`
  Rationale: Verifies that the `.actionSegmentVisitorLog` icon becomes visible/active on row hover and shows the expected title. Pure visibility + tooltip text.
  Proposed assertion strategy: After hovering the row's first cell and the segment icon, assert the icon element is visible and its `title`/`aria-label` matches the expected segmented title.

### Segmented visitor log dialog (`.ui-dialog`)
- `ActionsDataTable_segmented_visitor_log`: `replace`
  Rationale: From the Actions plugin's perspective, the only Actions-owned behaviour is "clicking the icon opens a dialog with the correct segmented title". The dialog body itself is the Live plugin's visitor log and is shared chrome from Actions' point of view.
  Proposed assertion strategy: Assert `.ui-dialog` becomes visible, `.ui-dialog-title` text contains the expected segmented title (referencing the clicked row's label), and at least one visitor row is rendered inside.

### Search action toolbar
- `ActionsDataTable_search_visible`: `replace`
  Rationale: Clicking the search icon reveals an input. Visibility-only state.
  Proposed assertion strategy: Assert `.searchAction .dataTableSearchInput` is visible and focused, with empty value.
- `ActionsDataTable_search`: `replace`
  Rationale: Typing a query and submitting filters the rows. Coverage is row-count/labels — behavioural.
  Proposed assertion strategy: Assert input value is `'i'`, every visible label cell contains `i` (case-insensitive), and the data-row count matches the expected filtered count.
- `ActionsDataTable_search_closed`: `remove`
  Rationale: After closing search the table returns to the baseline render (visually duplicates `initial` / `exclude_low_population` for this 1350x768 viewport). No distinct visual coverage.
  Proposed assertion strategy: N/A — replace with a tiny behavioural assertion in the close-search test (`.dataTableSearchInput` is not visible, query is cleared) rather than a separate screenshot.

### Auto-expand subtables (viewDataTable=table)
- `ActionsDataTable_auto_expand`: `replace`
  Rationale: Verifies that clicking a row that contains a single-folder subtable auto-expands it. The interesting fact is "expected leaf labels are now visible", which is a DOM assertion.
  Proposed assertion strategy: After the two clicks, assert the expected nested leaf rows (`blog`, `2012`, then auto-expanded children) are present in the DOM and visible, and that the `tr.subDataTable.expanded` chain has the expected depth.

## Confidence And Review Risk
- Confidence: `high`
- Review risk: The `initial` baseline retained as the single visual proof for the Actions data table also stands in for many state variants (sort, flatten, exclude-low-pop, search-closed, unflattened). If a future change quietly breaks the toolbar/header styling on those variants but not on the initial render, the replacement DOM-only checks will not catch it. Mitigation in the patch pass: ensure the keep covers a dataset/state that exercises both label-cell and metric columns plus the action toolbar, and consider widening behavioural assertions where styling matters (e.g. active sort indicator class on header).

## Summary
The Actions UI suite is a single-spec `ActionsDataTable` exercise of one widget region (the PageUrls report rendered as a `dataTable`) plus three small sub-regions: the configuration dropdown panel, hover tooltips, and the visitor-log dialog. Most of the 15 screenshots are state transitions on the same region (sort, subtable expand, flatten, exclude-low-pop, search) where DOM/text assertions are sufficient. We retain one full-page baseline (`initial`) as the canonical visual proof for the data-table region and replace the rest. Three are pure duplicates of an existing region and can be removed outright (`unflattened`, `unique_pageview_percentages`, `search_closed`).

## Files That Would Change In A Later Patch Pass
- `plugins/Actions/tests/UI/ActionsDataTable_spec.js`
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_column_sorted.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_subtables_loaded.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_flattened.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_exclude_low_population.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_unflattened.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_configuration_options.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_pageview_percentages.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_unique_pageview_percentages.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_segmented_visitor_log_hover.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_segmented_visitor_log.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_search_visible.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_search.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_search_closed.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_auto_expand.png` (delete)
- `plugins/Actions/tests/UI/expected-screenshots/ActionsDataTable_initial.png` (retain)

## Estimated Patch Size
- `Medium`

## Implementation Plan
- Retain: `ActionsDataTable_initial` (single visual baseline of the Actions data-table widget region).
- Replace first (high-value, low-risk behavioural conversions in this order):
  1. `search_visible`, `search` — straightforward visibility + filtered row count.
  2. `column_sorted` — header active-sort class plus first-row value or label order.
  3. `exclude_low_population` — row count and active option state.
  4. `flattened` — flat flag and label content with `/` segments.
  5. `pageview_percentages` — hover tooltip text/visibility.
  6. `segmented_visitor_log_hover` — icon visibility + title text.
  7. `segmented_visitor_log` — `.ui-dialog` opens with expected segmented title.
  8. `configuration_options` — `.tableConfiguration` visible with expected item set.
  9. `subtables_loaded` — expanded-row count and child labels.
  10. `auto_expand` — expected leaf labels visible after the two clicks.
- Remove outright (no behavioural test needed beyond a tiny inline assertion in an adjacent test):
  1. `unflattened` — fold a one-line "flat flag is off" check into the existing test.
  2. `unique_pageview_percentages` — same tooltip pattern as `pageview_percentages`.
  3. `search_closed` — fold a one-line "search input hidden" check into the close-search test.
- Safest file order for a later patch pass:
  1. Edit `plugins/Actions/tests/UI/ActionsDataTable_spec.js` — convert assertions and drop the three remove-outright tests' screenshot calls.
  2. Delete the 14 expected-screenshot PNGs listed above; keep only `ActionsDataTable_initial.png`.
  3. Run `ddev matomo:console tests:run-ui --plugin=Actions` to confirm the retained baseline still passes and the new behavioural assertions are stable.
