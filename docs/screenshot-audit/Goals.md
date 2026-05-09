# Goals

## Screenshot Tests Found
- `plugins/Goals/tests/UI/Goals_spec.js`
- `plugins/Goals/tests/UI/GoalsPages_spec.js`
- `plugins/Goals/tests/UI/GoalsTable_spec.js`
- `plugins/Goals/tests/UI/ManageGoals_spec.js`

## Grouping By Rendered Component Region

### Goals Overview reporting page (`.reporting-page` / `.pageWrap` for Goals > Overview)
- `Goals_overview.png`: `keep`
  Rationale: Single representative baseline for the Goals overview reporting page rendered by the Goals plugin. The page combines sparklines, evolution chart, and a goal-by-goal summary table whose layout is genuinely visual.
  Proposed assertion strategy: N/A (retain as the one keeper for this region).
- `GoalsPages_overview.png`: `remove`
  Rationale: Same plugin-owned region (Goals > Overview page) as `Goals_overview.png`. Adds no distinct visual variant; just a different fixture/date and slightly different selector (`.pageWrap` vs `.reporting-page`). Test intent (page renders without error and shows Goals overview content) can be covered by DOM assertions plus the kept baseline above.
  Proposed assertion strategy: Replace screenshot assertion with DOM assertions: presence of `.pageWrap`, presence of the goal sparkline rows, count of conversion sparklines/visible goals, and visible "Goals" header / metric labels.

### Goals Ecommerce overview page (`.pageWrap` for Goals_Ecommerce > General_Overview)
- `GoalsPages_ecommerce.png`: `keep`
  Rationale: Distinct plugin-owned rendered region (ecommerce overview page) with its own layout (ecommerce-specific sparklines, in-cart vs orders blocks). Worth one visual baseline.
  Proposed assertion strategy: N/A.

### Sparkline tooltip on ecommerce overview (`.ui-tooltip` from sparkline hover)
- `GoalsPages_revenue_incart_tooltip.png`: `replace`
  Rationale: Tooltip content is text/number-driven. The companion test in the same spec (last year comparison) already asserts on tooltip text content; this screenshot adds no genuinely visual coverage that DOM/text assertions cannot match.
  Proposed assertion strategy: Assert tooltip is visible and assert tooltip text contains the expected currency/period strings (mirror the pattern already used by the next test in the file).

### Goals Management page (Goals admin/manage list)
- `GoalsPages_manage.png`: `keep`
  Rationale: Single representative baseline for the Goals management table region (entity table layout + add-goal button + ecommerce setting toggle). Layout combines top bar, entity container, action buttons.
  Proposed assertion strategy: N/A.

### Single goal report page (`.pageWrap` for Goals_Goals > subcategory=<id>)
- `GoalsPages_individual_goal.png`: `keep`
  Rationale: Distinct plugin-owned region (per-goal report page) with its own layout: goal header, sparklines, evolution graph, dimension reports list. Worth one visual baseline distinct from the goals overview.
  Proposed assertion strategy: N/A.
- `GoalsPages_individual_goal_updated.png`: `replace`
  Rationale: Same rendered region as `individual_goal`; the only thing under test is that clicking a sparkline updates the evolution chart. That is a state-change behavior, not a distinct visual variant.
  Proposed assertion strategy: Assert the sparkline click updates the chart series (e.g. selected sparkline gets the `linked` active class, evolution chart `[data-name=...]` series indicator changes, or the chart title/legend reflects the conversion-rate metric).
- `Goals_individual_xss.png`: `replace`
  Rationale: Test name is "should load goal page for XSS name". Intent is XSS escaping, not visual layout. A text/HTML assertion is a stronger and faster check than a screenshot.
  Proposed assertion strategy: Assert the goal title element's `textContent` equals the literal XSS payload (i.e. raw script tags appear as text), and assert no `<script>` element is rendered inside `.reporting-page` for that payload.

### Goals "by dimension" sub-report (`.dimensionReport` block reused for pages / page titles / entry pages / entry page titles)
- `Goals_goals_by_pages.png`: `keep`
  Rationale: Single representative baseline for the `.dimensionReport` region with the Goals-aware datatable visualization (goal columns, conversion-rate cells, action row icons).
  Proposed assertion strategy: N/A.
- `Goals_goals_by_page_titles.png`: `remove`
  Rationale: Same `.dimensionReport` region, different dimension. No distinct visual variant beyond the dimension column values; covered by `goals_by_pages` keeper.
  Proposed assertion strategy: Replace with DOM assertions that the dimension report renders (count of rows, presence of goals columns, dimension header text "Page Title").
- `Goals_goals_by_entry_pages.png`: `remove`
  Rationale: Same `.dimensionReport` region; dimension swap only.
  Proposed assertion strategy: DOM assertions for entry page dimension header and rendered table rows.
- `Goals_goals_by_entry_page_titles.png`: `remove`
  Rationale: Same `.dimensionReport` region; dimension swap only.
  Proposed assertion strategy: DOM assertions for entry page title dimension header and rendered table rows.

### Row Evolution dialog (`.ui-dialog` opened from datatable row evolution icon)
- `Goals_goals_by_pages_row_evolution.png`: `keep`
  Rationale: Single representative baseline for the row evolution dialog as used by Goals reports (graph + metric pickers + multi-series legend). One visual baseline is justified for this dialog.
  Proposed assertion strategy: N/A.
- `Goals_goals_by_entry_page_titles_row_evolution.png`: `remove`
  Rationale: Same `.ui-dialog` row evolution region as the keeper; only the underlying dimension differs.
  Proposed assertion strategy: Assert dialog opens (`.ui-dialog` visible) and contains a row-evolution chart and at least one metric picker entry; assert dialog title reflects the dimension.
- `GoalsPages_overview_row_evolution.png`: `remove`
  Rationale: Same `.ui-dialog` row evolution region; entry trigger differs.
  Proposed assertion strategy: Assert dialog visible and chart container present.
- `GoalsPages_overview_row_evolution_reloaded.png`: `replace`
  Rationale: Test intent is "row evolution survives a hard URL reload" - that is a behavioral persistence check, not a visual one.
  Proposed assertion strategy: After reload, assert `.ui-dialog` is visible without manual reopening, and the row-evolution chart container is present (DOM-only).
- `GoalsPages_individual_row_evolution.png`: `remove`
  Rationale: Same `.ui-dialog` row evolution region triggered from the individual goal page.
  Proposed assertion strategy: DOM assertion that dialog opened and contains `.rowevolution`.
- `GoalsPages_individual_row_evolution_reloaded.png`: `replace`
  Rationale: Same persistence-on-reload behavioral intent as `overview_row_evolution_reloaded`; not a distinct visual.
  Proposed assertion strategy: After reload, assert dialog is visible without re-trigger and `.rowevolution` is present.
- `Goals_action_goals_row_evolution.png`: `replace`
  Rationale: Variant differs only in that one of the chart series is toggled off via clicking `[data-name="series3"]`. That is a behavioral state assertion, not a visual layout one.
  Proposed assertion strategy: After clicking the series toggle, assert the legend item for series3 has the disabled/unselected class and the chart no longer reports series3 in the active set (e.g. via DOM class or chart instance data).

### Action goals visualization (Actions > Pages with `viewDataTable=tableGoals`, full-page screenshots)
- `Goals_action_goals_visualization_page_urls.png`: `keep`
  Rationale: Single representative baseline for the action goals visualization (the tableGoals view applied to an Actions report). Combines wide column set (per-goal columns) with the actions hierarchy, which is genuinely visual.
  Proposed assertion strategy: N/A.
- `Goals_action_goals_visualization_page_urls_subtable.png`: `replace`
  Rationale: Test intent is that clicking a row expands its subtable. That is a behavioral assertion (expanded row visible) rather than a distinct visual baseline; using `fullPage` here also makes it brittle.
  Proposed assertion strategy: After clicking the row, assert a `.subDataTable` row is now expanded (`.expanded` / `tr.subDataTable--expanded` class), child rows count > 0, and the expanded row's `data-row-metadata` matches expectations.

### Widgetized goals datatable footer (`tableGoals` icon-driven views inside Widgetize iframe)
- `GoalsTable_initial.png`: `keep`
  Rationale: Single representative baseline for the goals visualization rendered inside the Widgetize iframe (iframe chrome + footer + tableGoals columns). Uses fullPage but the rendered region is plugin-owned (visualization + footer icons).
  Proposed assertion strategy: N/A.
- `GoalsTable_goals_table_full.png`: `replace`
  Rationale: Test intent: "should show columns for all goals when idGoal is 0". That is a column-count / column-header assertion, not a layout check.
  Proposed assertion strategy: Assert table renders, count of `<th>` cells matches expected goals + base columns, and assert each goal's header text appears.
- `GoalsTable_goals_table_single.png`: `replace`
  Rationale: Test intent: columns shown for a single goal (idGoal=1). DOM/text assertions cover this faithfully.
  Proposed assertion strategy: Assert table headers contain only the single goal's name and that columns specific to multi-goal mode are absent.
- `GoalsTable_goals_table_ecommerce.png`: `replace`
  Rationale: Same datatable region; intent is the ecommerce-order column set.
  Proposed assertion strategy: Assert ecommerce columns (Revenue, Orders, Avg Order Value, etc.) are present in `<th>` cells and abandoned-cart columns are not.
- `GoalsTable_goals_table_ecommerce_view.png`: `replace`
  Rationale: Same datatable region with `viewDataTable=ecommerceOrder`. Intent is "the ecommerce-specific view renders correctly".
  Proposed assertion strategy: Assert `.dataTable[data-table-type=ecommerceOrder]` exists, expected ecommerce columns and rows are present.
- `GoalsTable_goals_table_abandoned_carts.png`: `replace`
  Rationale: Test intent: clicking the abandoned-carts footer icon switches the visualization. Behavioral / state assertion.
  Proposed assertion strategy: After click, assert active footer icon is `[data-footer-icon-id=ecommerceAbandonedCart]` and table shows abandoned-cart-specific columns (e.g. `nb_abandoned_carts`, `revenue_abandoned`) via header text.

### Add/Edit Goal form copy wrapping (`description_wraps` and `manage_goals_mobile_table_contained`)
- `ManageGoals_description_wraps.png`: `flag`
  Rationale: Intent is "long textarea content wraps onto a new line" - that is a CSS/wrap behavior. DOM-only assertions can approximate (computed `white-space`, `overflow-wrap`, scrollHeight > line-height) but the actual wrapping is genuinely visual. Plugin owns the form template, so this is a legitimate visual concern. Confidence is low about whether to keep one of the two manage-goals visual baselines or both, since the second one (`manage_goals_mobile_table_contained`) covers a different responsive layout.
  Proposed assertion strategy: Either keep as the single visual baseline for the goal form wrapping behavior, or replace with a computed-style + scrollHeight assertion verifying the textarea content wraps (no horizontal overflow).
- `ManageGoals_manage_goals_mobile_table_contained.png`: `keep`
  Rationale: Distinct rendered variant: smaller viewport (800x900) of the goal edit card content. This is a responsive-layout visual assertion that DOM/text checks would not credibly cover. Worth one keeper for the responsive variant of the goal edit card.
  Proposed assertion strategy: N/A.

## Confidence And Review Risk
- Confidence: `medium`
- Review risk: The two ManageGoals screenshots both legitimately concern visual wrapping/responsive behavior. Reviewers may disagree on whether `description_wraps` should be kept (it is the only baseline guarding desktop textarea wrapping) or replaced with computed-style assertions. Also, datatable column-set "replace" decisions in GoalsTable depend on a stable set of `<th>` text values - if those headers are i18n-fragile, the replacements will need to assert on data attributes rather than visible text.

## Summary
Goals has 29 screenshot assertions split across four specs that mostly cover four plugin-owned regions: the Goals overview / individual / dimension report pages, the row-evolution dialog, the goals datatable visualization, and the manage-goals form. Many screenshots are duplicates of the same rendered region (different dimensions, different trigger paths) or are really behavioral assertions (XSS escaping, sparkline-driven chart update, dialog persistence after reload, footer-icon view switching, subtable expansion). Audit retains 7 visual baselines, replaces 14 with DOM/text/state assertions, removes 7 outright as same-region duplicates, and flags 1 (`description_wraps`) where the visual-vs-behavioral line is debatable.

Decision tally: keep 7, replace 14, remove 7, flag 1 (total 29).

## Files That Would Change In A Later Patch Pass
- `plugins/Goals/tests/UI/Goals_spec.js`
- `plugins/Goals/tests/UI/GoalsPages_spec.js`
- `plugins/Goals/tests/UI/GoalsTable_spec.js`
- `plugins/Goals/tests/UI/ManageGoals_spec.js`
- `plugins/Goals/tests/UI/expected-screenshots/` (delete PNGs for removed/replaced assertions)

## Estimated Patch Size
- `Medium`

## Implementation Plan

Retained screenshots to keep (7):
- `Goals_overview.png` (Goals overview reporting page)
- `GoalsPages_ecommerce.png` (Ecommerce overview page)
- `GoalsPages_manage.png` (Goals Management page)
- `GoalsPages_individual_goal.png` (Single goal report page)
- `Goals_goals_by_pages.png` (representative `.dimensionReport`)
- `Goals_goals_by_pages_row_evolution.png` (representative `.ui-dialog` row evolution)
- `Goals_action_goals_visualization_page_urls.png` (action goals visualization)
- `GoalsTable_initial.png` (widgetized goals datatable view)
- `ManageGoals_manage_goals_mobile_table_contained.png` (responsive manage-goals card)

(Note: that is 9 keepers if `description_wraps` is also retained pending the flag resolution - 7 firm keepers plus 2 ManageGoals visuals where one is a flag.)

Screenshot assertions to replace first (lowest risk, behavior-only):
1. `GoalsPages_revenue_incart_tooltip` -> tooltip text contains expected currency/period strings (mirror neighbor test pattern).
2. `Goals_individual_xss` -> assert escaped textContent and absence of injected `<script>`.
3. `GoalsPages_overview_row_evolution_reloaded` / `GoalsPages_individual_row_evolution_reloaded` -> assert dialog still visible after URL reload.
4. `Goals_action_goals_visualization_page_urls_subtable` -> assert expanded subtable rows.
5. `Goals_action_goals_row_evolution` -> assert series3 toggled off in chart legend.
6. `GoalsPages_individual_goal_updated` -> assert sparkline click updates evolution chart series/title.
7. GoalsTable column-set checks (`goals_table_full`, `goals_table_single`, `goals_table_ecommerce`, `goals_table_ecommerce_view`, `goals_table_abandoned_carts`) -> assert on table headers and active footer icon.

Screenshot assertions to remove outright (same-region duplicates of a kept baseline):
- `GoalsPages_overview.png`
- `Goals_goals_by_page_titles.png`
- `Goals_goals_by_entry_pages.png`
- `Goals_goals_by_entry_page_titles.png`
- `Goals_goals_by_entry_page_titles_row_evolution.png`
- `GoalsPages_overview_row_evolution.png`
- `GoalsPages_individual_row_evolution.png`

Safest file order for a later patch pass:
1. `plugins/Goals/tests/UI/GoalsTable_spec.js` - cluster of column/state replacements; least entanglement with other specs.
2. `plugins/Goals/tests/UI/Goals_spec.js` - dimension-report dedup and action-goals subtable/row-evolution replacements.
3. `plugins/Goals/tests/UI/GoalsPages_spec.js` - overview/individual page dedup, row-evolution-reloaded persistence assertions, tooltip text assertion.
4. `plugins/Goals/tests/UI/ManageGoals_spec.js` - resolve the `description_wraps` flag last (decide keep vs replace), then prune any obsolete screenshots.
5. Delete PNGs under `plugins/Goals/tests/UI/expected-screenshots/` only after the corresponding spec edits land.
