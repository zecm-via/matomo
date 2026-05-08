# CustomDimensions

## Screenshot Tests Found
- `plugins/CustomDimensions/tests/UI/CustomDimensions_spec.js`

## Grouping By Rendered Component Region

### Manage Custom Dimensions list (`.manageCustomDimensions` table)
- `CustomDimensions_manage_inital`: `keep`
  Rationale: Single representative baseline of the manage page table layout (column headings, scope groupings, configure buttons, per-row edit icons). This is the canonical visual state of the plugin-owned manage component and should be retained once.
  Proposed assertion strategy: N/A
- `CustomDimensions_manage_new_visit_dimension_created`: `replace`
  Rationale: Re-renders the same list as `manage_inital` plus one new row. Coverage is "row count grew by one and contains 'My Custom Name' with active state and visit scope" — pure DOM/text.
  Proposed assertion strategy: Assert a new `tr` exists in the visit-scope section with name `My Custom Name`, the active toggle/icon shows active, and total visit-dimension row count incremented by one.
- `CustomDimensions_manage_new_action_dimension_created`: `replace`
  Rationale: Same list region after creating an action dimension. Visual layout already covered by `manage_inital`. Test intent is "row added in action scope with name `My Action Name`".
  Proposed assertion strategy: Assert action-scope section contains a row with label `My Action Name` and the action-scope row count incremented by one.
- `CustomDimensions_manage_edit_action_dimension_updated`: `replace`
  Rationale: Returns to the list after pressing update. Test intent is that the dimension row now displays the updated name `ABC` and active flag is off — text/state, not visual.
  Proposed assertion strategy: Locate `.customdimension-8` row and assert label text is `ABC` and the active indicator reflects inactive.
- `CustomDimensions_manage_edit_action_dimension_cancel`: `replace`
  Rationale: After cancel the user is back on the list view. The visual layout duplicates `manage_inital`. Intent is "edit form closed, list visible".
  Proposed assertion strategy: Assert `.editCustomDimension` is no longer in the DOM (or hidden) and `.manageCustomDimensions` table is visible.
- `CustomDimensions_manage_configure_button_disabled`: `replace`
  Rationale: Verifies the visit-scope `Configure a new Dimension` button becomes disabled once all dimension slots are used. Disabled state is a DOM attribute, not a visual.
  Proposed assertion strategy: Assert `.scope-visit .btn` has the `disabled` attribute / `disabled` class and that the visit-scope row count equals the configured maximum.

### Manage Custom Dimensions edit form (`.editCustomDimension`)
- `CustomDimensions_manage_new_visit_dimension_open`: `keep`
  Rationale: Single retained baseline for the edit-form variant that has no extractions section (visit scope). Verifies the visit-scope form layout — that the extractions block is not rendered for visit scope. This is genuinely visual / structural and not trivially expressible without checking many sub-element absences.
  Proposed assertion strategy: N/A
- `CustomDimensions_manage_new_action_dimension_open`: `keep`
  Rationale: Single retained baseline for the action-scope edit form, which adds the extractions sub-component absent from visit scope. Distinct visual variant from the visit-scope form, so worth keeping one baseline.
  Proposed assertion strategy: N/A
- `CustomDimensions_manage_new_action_dimension_withdata`: `replace`
  Rationale: Same action-scope form already covered by `manage_new_action_dimension_open`, just with text typed into name and three extraction patterns added. Intent is "three extraction rows present with correct values, plus/minus buttons rendered".
  Proposed assertion strategy: Assert `.editCustomDimension #name` value is `My Action Name` and that `.extraction0`, `.extraction1`, `.extraction2` exist with their respective `#pattern0`, `#pattern1`, `#pattern2` values.
- `CustomDimensions_manage_new_action_dimension_remove_an_extraction`: `replace`
  Rationale: Verifies that clicking minus on extraction1 removes that row. State change, not a visual.
  Proposed assertion strategy: Assert that exactly two extraction rows remain and that the remaining patterns are the originally typed values for slots 0 and 2 (re-indexed if applicable).
- `CustomDimensions_manage_edit_action_dimension_verify_created`: `replace`
  Rationale: Edit form populated with previously created action dimension. Intent is "form is pre-filled with the values just saved" — pure value/text checks.
  Proposed assertion strategy: Assert `#name` value is `My Action Name`, active checkbox is checked, and extraction rows match the patterns saved in the previous test.
- `CustomDimensions_manage_edit_action_dimension_withdata`: `replace`
  Rationale: After flipping name to `ABC`, toggling active, toggling case-sensitive and removing one extraction. All field-level state. Asset is byte-identical to `manage_edit_action_dimension_verify_updated` (130179 bytes), so two screenshots already cover the same region with no distinct visual value.
  Proposed assertion strategy: Assert `#name` value is `ABC`, `#active` is unchecked, `#casesensitive` is checked, and extraction-row count decreased by one.
- `CustomDimensions_manage_edit_action_dimension_verify_updated`: `remove`
  Rationale: Asset is byte-identical to `manage_edit_action_dimension_withdata` (both 130179 bytes) — same edit-form region with the same updated values. Replacing the prior screenshot with state assertions already covers it; this one adds no distinct visual coverage.
  Proposed assertion strategy: N/A — covered by the assertions added for `manage_edit_action_dimension_withdata` plus a re-fetch of the form after navigating back into edit.
- `CustomDimensions_manage_create_via_url`: `remove`
  Rationale: Asset is byte-identical to `manage_new_action_dimension_open` (both 76926 bytes) — same blank action-scope create form. Intent is purely "URL hash `idDimension=0&scope=action` opens the create form". Already covered by the kept `manage_new_action_dimension_open` baseline plus a routing-state check.
  Proposed assertion strategy: After navigating to the URL, assert `.editCustomDimension` is visible and that the form is in create mode (e.g., name input is empty, the `.create` button is rendered rather than `.update`).
- `CustomDimensions_manage_edit_via_url`: `replace`
  Rationale: Same edit-form region opened by URL hash for an existing dimension (`idDimension=5&scope=action`). Visual already covered by `manage_new_action_dimension_open`. Intent is "the form opens populated with dimension 5's values".
  Proposed assertion strategy: Assert the edit form is in update mode (`.update` button rendered) and that `#name` and active/case-sensitive fields hold the expected values for dimension 5.

### Visit-dimension report (`.pageWrap` for `customdimension2`)
- `CustomDimensions_report_visit`: `keep`
  Rationale: Single retained baseline of the rendered visit-dimension report for this plugin (data table + chart for the visit-scope custom dimension). Confirms the plugin-owned report renders at all and lays out as expected.
  Proposed assertion strategy: N/A

### Secondary navigation menu (`#secondNavBar`) generated by CustomDimensions
- `CustomDimensions_report_visit_mainmenu`: `replace`
  Rationale: Test intent is "menu items are added for each active visit dimension". Menu entry text and presence is DOM/text — not a visual concern. Note: `#secondNavBar` is shared chrome rendered by core, but the *items* are plugin-driven, so coverage stays plugin-local via assertions on those entries.
  Proposed assertion strategy: Assert `#secondNavBar` contains a link/entry for each active visit dimension (by name, e.g., `MyName1`, `My Custom Name`).
- `CustomDimensions_report_actions_mainmenu`: `replace`
  Rationale: Same as above for action dimensions.
  Proposed assertion strategy: Assert `#secondNavBar` contains a link/entry for each active action dimension.

### Goals overview "By Dimension" panel (`.reportsByDimensionView`)
- `CustomDimensions_report_goals_overview`: `replace`
  Rationale: Verifies that custom dimensions appear in the goals "By Dimension" list and that clicking one renders the per-goal table. Intent is that the dimension `MyName1` is listed and clickable, and that the right-hand table renders. No genuinely visual-only state.
  Proposed assertion strategy: Assert `.reportsByDimensionView .dimension:contains(MyName1)` exists, click it, then assert the goal-by-dimension table renders with at least one row.

### Action-dimension report (`.pageWrap` for `customdimension3`)
- `CustomDimensions_report_action`: `keep`
  Rationale: Single retained baseline for the action-dimension report. Distinct visual variant from the visit-scope report (different row actions, subtable affordances) and worth one baseline.
  Proposed assertion strategy: N/A
- `CustomDimensions_report_actions_rowactions`: `replace`
  Rationale: Verifies that hovering a top-level action-dimension row offers only the segmented-visitor-log and row-evolution row-action icons (i.e., no transitions). That is a DOM presence/absence check.
  Proposed assertion strategy: Hover the first row and assert `a.actionSegmentVisitorLog` and `a.actionRowEvolution` are visible while `a.actionTransitions` is not present.
- `CustomDimensions_report_action_insights`: `keep`
  Rationale: Single retained baseline for the insights visualization on a custom action dimension. Insights is a chart/visualization region — genuinely visual layout that DOM assertions cover poorly.
  Proposed assertion strategy: N/A
- `CustomDimensions_report_action_subtable`: `replace`
  Rationale: Verifies that expanding to subtable level offers the *full* row-action set (including transitions) when hovered. DOM presence again, parallel to `report_actions_rowactions` but inverted.
  Proposed assertion strategy: Click into subtable, hover an `en_US` row and assert `a.actionSegmentVisitorLog`, `a.actionRowEvolution`, and `a.actionTransitions` are all visible.

### Row-evolution popover (shared dialog rendered with custom-dimension data)
- `CustomDimensions_report_actions_rowevolution`: `keep`
  Rationale: Single retained baseline for the row-evolution popover rendered against custom-dimension data — visual chart + metrics table. Worth keeping one representative.
  Proposed assertion strategy: N/A
- `CustomDimensions_report_action_subtable_rowevolution`: `remove`
  Rationale: Same row-evolution popover region as `report_actions_rowevolution`, just opened from a subtable row. No distinct visual variant — same dialog, same chart layout.
  Proposed assertion strategy: N/A — covered by the kept `report_actions_rowevolution` baseline plus a behavioral assertion that the popover opens after `triggerRowAction('en_US', 'actionRowEvolution')`.

### Segmented visitor log popover (shared dialog rendered with custom-dimension data)
- `CustomDimensions_report_actions_segmented_visitorlog`: `keep`
  Rationale: Single retained baseline for the segmented-visitor-log popover when launched from a custom-dimension row. The popover content is itself rich and visual; one baseline is reasonable.
  Proposed assertion strategy: N/A
- `CustomDimensions_report_action_subtable_segmented_visitor_log`: `remove`
  Rationale: Same popover region as `report_actions_segmented_visitorlog`, just launched from the subtable. No distinct visual variant.
  Proposed assertion strategy: N/A — covered by the kept baseline plus a behavioral assertion that `triggerRowAction('en_US', 'actionSegmentVisitorLog')` opens the dialog.

### Transitions popover (shared dialog rendered with custom-dimension data)
- `CustomDimensions_report_action_subtable_transitions`: `flag`
  Rationale: Only screenshot covering the transitions popover for this plugin, and transitions is a heavy visual flow diagram. However, transitions is a core/shared component and its visual fidelity is exercised elsewhere in core; the plugin-local intent here is just "transitions is offered for action-dimension subtable rows" (also covered by `report_action_subtable`'s row-action assertion). Flag because the keep/replace decision depends on whether transitions visual is exercised in another plugin, which is out of scope per the determinism rules.
  Proposed assertion strategy: If demoted: assert the popover opens after `triggerRowAction('en_US', 'actionTransitions')` and that it contains the transitions root element (e.g., `.ui-dialog .Transitions_Report` or equivalent selector). Leave the screenshot in place if the team prefers visual coverage of the transitions popover.

## Confidence And Review Risk
- Confidence: `high`
- Review risk: The biggest risk is over-trimming the manage edit form. Two retained baselines (`manage_new_visit_dimension_open` and `manage_new_action_dimension_open`) are proposed because the action-scope form adds the extractions sub-region. A reviewer who feels the extractions UI is itself non-visual may want to drop one of those two. The transitions popover is the only genuinely subjective call and is flagged.

## Summary
CustomDimensions has 28 screenshots across one spec. Most are state-transition or value-verification screenshots that should become DOM/state assertions. Three plugin-owned regions justify one visual baseline each — the manage list, the visit-dimension report, the action-dimension report — plus one for each of two distinct edit-form variants (visit vs. action) and one each for insights, the row-evolution popover and the segmented-visitor-log popover. Three byte-identical asset pairs already exist (`manage_new_action_dimension_open` ≡ `manage_create_via_url`; `manage_edit_action_dimension_withdata` ≡ `manage_edit_action_dimension_verify_updated`), confirming that several screenshots add no distinct visual coverage. Decisions: 7 keep, 17 replace, 3 remove, 1 flag.

## Files That Would Change In A Later Patch Pass
- `plugins/CustomDimensions/tests/UI/CustomDimensions_spec.js`
- `plugins/CustomDimensions/tests/UI/expected-screenshots/` (deletions for screenshots marked `remove` and `replace`)

## Estimated Patch Size
- `Medium`

## Implementation Plan
- Retained screenshots to keep (7):
  - `CustomDimensions_manage_inital`
  - `CustomDimensions_manage_new_visit_dimension_open`
  - `CustomDimensions_manage_new_action_dimension_open`
  - `CustomDimensions_report_visit`
  - `CustomDimensions_report_action`
  - `CustomDimensions_report_action_insights`
  - `CustomDimensions_report_actions_rowevolution`
  - `CustomDimensions_report_actions_segmented_visitorlog`
  - (Optionally `CustomDimensions_report_action_subtable_transitions` — see flag.)
- Screenshot assertions to replace first (low risk, high signal):
  1. `manage_new_visit_dimension_created`, `manage_new_action_dimension_created`, `manage_edit_action_dimension_updated`, `manage_edit_action_dimension_cancel` — all simple list-state checks.
  2. `manage_configure_button_disabled` — single attribute assertion.
  3. `report_visit_mainmenu`, `report_actions_mainmenu` — text/presence in `#secondNavBar`.
  4. `report_actions_rowactions`, `report_action_subtable` — DOM presence/absence of row-action icons.
  5. `report_goals_overview` — list contains, click, table renders.
  6. `manage_new_action_dimension_withdata`, `manage_new_action_dimension_remove_an_extraction`, `manage_edit_action_dimension_verify_created`, `manage_edit_action_dimension_withdata`, `manage_edit_via_url` — form value/state checks.
- Screenshot assertions to remove outright (3):
  - `manage_edit_action_dimension_verify_updated` (byte-identical duplicate)
  - `manage_create_via_url` (byte-identical duplicate; replaced by routing-state assertion)
  - `report_action_subtable_rowevolution`, `report_action_subtable_segmented_visitor_log` (popover regions already covered by their non-subtable counterparts; demote to behavioral assertions only)
- Safest file order for a later patch pass:
  1. Remove byte-identical duplicates and their `expect(...).to.matchImage(...)` calls, replacing them with the documented behavioral assertions, but make no other test logic changes.
  2. Convert the manage list-state screenshots (`manage_*_created`, `manage_edit_*_updated`, `manage_edit_*_cancel`, `manage_configure_button_disabled`) to DOM/state assertions.
  3. Convert the manage edit-form value screenshots in spec order (`withdata` / `remove_an_extraction` / `verify_created` / `edit_action_dimension_withdata` / `edit_via_url`).
  4. Convert the report-region screenshots in spec order (`report_visit_mainmenu`, `report_actions_mainmenu`, `report_actions_rowactions`, `report_action_subtable`, `report_goals_overview`).
  5. Decide the `report_action_subtable_transitions` flag last; if demoting, convert to a presence-only assertion in a separate small commit.
  6. Delete unreferenced PNGs from `expected-screenshots/` only after the spec changes pass locally.
