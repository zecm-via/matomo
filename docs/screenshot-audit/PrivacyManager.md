# PrivacyManager

## Screenshot Tests Found
- `plugins/PrivacyManager/tests/UI/PrivacyManager_spec.js`
- `plugins/PrivacyManager/tests/UI/PrivacyManager_SiteSpecific_spec.js`
- `plugins/PrivacyManager/tests/UI/PrivacyManager_ConsentManager_spec.js`

Enumerated screenshot assertions: 46
- PrivacyManager_spec.js: 34
- PrivacyManager_SiteSpecific_spec.js: 11
- PrivacyManager_ConsentManager_spec.js: 1

All expected PNGs were inspected as real files (not LFS pointers). Three byte-identical pairs were detected via SHA-256:
- `..._anonymizeip_and_visit_column_prefilled.png` == `..._anonymizeip_and_visit_column_cancelled.png`
- `gdpr_tools_uncheck_one_visit.png` == `gdpr_tools_delete_visit_cancelled.png`
- `load_site_specific_settings_from_instance_for_site2.png` == `load_site_specific_settings_site2.png`

## Grouping By Rendered Component Region

### Region: Users Opt-Out page (`?action=usersOptOut`)
- `users_opt_out_default`: `keep`
  Rationale: Single representative of the public-facing opt-out widget rendered by the plugin. The page is genuinely visual (form layout, copy, embeddable widget chrome) and is the only screenshot covering this region.
  Proposed assertion strategy: N/A

### Region: Asking-for-consent page (`?action=consent`)
- `consent_default` (PrivacyManager_spec): `keep`
  Rationale: The plugin renders explanatory text plus example tracker snippet markup; one screenshot is justified to lock in the layout of the help page in its baseline state.
  Proposed assertion strategy: N/A
- `consent_default` (PrivacyManager_ConsentManager_spec, file `PrivacyManager_ConsentManager_consent_default.png`): `replace`
  Rationale: This spec exists only to verify that when a connected consent manager (Osano) is detected, an additional banner/notice section appears on the same page. That is a presence/copy assertion; pixel diffing the whole `.pageWrap` for it is overkill and depends on every other static element on the page.
  Proposed assertion strategy: Assert the consent-manager notice DOM exists (e.g. an Osano-related selector inside `.pageWrap`), and assert its visible text contains the expected reference to the connected consent manager. No screenshot.

### Region: GDPR Overview page (`?action=gdprOverview`)
- `gdpr_overview`: `replace`
  Rationale: Test intent is "Deletelogs/Deletereports retention values appear on the overview". That is text content (the configured 95-day / 131-day retention) and section presence — covered far more reliably with DOM/text assertions than a full-page pixel diff.
  Proposed assertion strategy: Assert that the GDPR overview renders the expected log-retention and report-retention sections with the configured values present in their text (e.g. "95", "131"), and that key headings/links are present.
- `gdpr_overview_no_retention`: `replace`
  Rationale: Test intent is the inverse of the previous one — when retention is disabled, the retention rows render their disabled/no-retention state. Pure copy/state difference; not a layout test.
  Proposed assertion strategy: Assert the absence of the retention day numbers and the presence of the disabled/no-retention messaging, or assert the DOM markers used to render the disabled state.

### Region: ePrivacy laws information page (`?action=ePrivacyLaws`)
- `eprivacy_laws`: `replace`
  Rationale: Static informational page rendered from translation strings; the existing assertion is "the `.eprivacyLaws` block exists and contains the expected text". A DOM/text check is sufficient.
  Proposed assertion strategy: Assert `.eprivacyLaws` is visible and contains the expected heading and a short stable substring of body copy.

### Region: Understanding-your-legal-obligations page (`?action=understandingYourLegalObligations`)
- `understanding_your_legal_obligations`: `replace`
  Rationale: Same pattern as ePrivacy laws — purely static informational copy. No interactive state.
  Proposed assertion strategy: Assert the page container is present and contains the expected stable heading text.

### Region: Privacy settings page — instance defaults form (`?action=privacySettings`, top of page)
- `privacy_settings_default`: `keep`
  Rationale: This is the canonical baseline of the full privacy-settings form (anonymize IP / location / user id / order id / referrer / DNT / scheduled deletes). Locking in one screenshot here is reasonable because the form is dense and visually structured. All other states for this region (config-id randomisation on/off, password-required) are state transitions of this same form.
  Proposed assertion strategy: N/A

### Region: Privacy settings — randomize config id flow (password modal + persisted value)
- `config_id_randomisation_on_password_required`: `replace`
  Rationale: Test intent is "submitting the form opens the confirm-password modal". That is a modal-open + copy assertion.
  Proposed assertion strategy: Assert `.confirm-password-modal.open` is visible and contains the expected confirmation copy and password input.
- `config_id_randomisation_on`: `replace`
  Rationale: After password confirmation, the page reloads with the toggle persisted on and a success notification. Both are DOM/state assertions.
  Proposed assertion strategy: Assert the `randomizeConfigId` checkbox is checked after reload and a success notification appears in `#notificationContainer`.
- `config_id_randomisation_off_password_not_required`: `replace`
  Rationale: Inverse — disabling does not require the password modal and saves directly. Pure state/notification check.
  Proposed assertion strategy: Assert the `randomizeConfigId` checkbox is unchecked, no `.confirm-password-modal.open` is present, and a success notification appears.

### Region: Anonymize log data widget (`.logDataAnonymizer` table + form)
- `anonymizelogdata_anonymizeip_and_visit_column_prefilled`: `keep`
  Rationale: One representative of the log-data anonymizer widget's prefilled state, including the visit-columns multiselect chips. The widget is dense and visual; one baseline anchors layout. All sibling screenshots for this region are state variations of the same widget.
  Proposed assertion strategy: N/A
- `anonymizelogdata_anonymizeip_and_visit_column_confirmation_message`: `replace`
  Rationale: Test intent is "a confirmation modal appears with the expected copy listing what will be anonymized". Modal copy assertion.
  Proposed assertion strategy: Assert `.modal.open` is visible and contains the expected confirmation text mentioning IP and the chosen visit columns, plus Cancel/Confirm buttons.
- `anonymizelogdata_anonymizeip_and_visit_column_cancelled`: `remove`
  Rationale: SHA-256 byte-identical to the `_prefilled` baseline (verified). After cancelling the modal the widget returns to exactly the prefilled state, so this screenshot adds no distinct visual coverage. Behavior ("modal closes, no API call fired") can be asserted without pixels.
  Proposed assertion strategy: Assert `.modal.open` is no longer present and that the form retains its prefilled selections (selected visit-column chips still present, anonymizeIp still ticked).
- `anonymizelogdata_anonymizeip_and_visit_column_confirmed`: `replace`
  Rationale: After confirming, the widget shows a success notification and (per the table-screenshot selector) a row added to the anonymization-jobs table. That is a notification + table-row count assertion.
  Proposed assertion strategy: Assert a success notification exists in `#notificationContainer` and that the `.logDataAnonymizer table` shows an additional row whose first cell text matches the just-submitted job description.
- `anonymizelogdata_anonymizelocation_anduserid_and_action_column_prefilled`: `replace`
  Rationale: Same widget as the kept baseline; only the selected fields differ (location, user id, action columns). The unique value here is "the right fields are selected/displayed" — a state assertion.
  Proposed assertion strategy: Assert that the anonymizeLocation, anonymizeTheUserId checkboxes are ticked and the chosen action-column chips are present in `.selectedActionColumns`.
- `anonymizelogdata_anonymizelocation_anduserid_and_action_column_confirmed`: `replace`
  Rationale: Same notification + history-table delta as the IP-confirmed case.
  Proposed assertion strategy: Assert a success notification is shown and the jobs table now contains an additional row reflecting the location/userid/action-column job.
- `anonymizelogdata_one_site_and_custom_date_prefilled`: `replace`
  Rationale: Differs only in the site selector value and the custom start/end date inputs. Pure form-state assertion.
  Proposed assertion strategy: Assert the site-selector chip text equals "Site 1", and `input.anonymizeStartDate` / `input.anonymizeEndDate` carry the expected custom values.
- `anonymizelogdata_one_site_and_custom_date_confirmed`: `replace`
  Rationale: Notification + jobs-table delta after confirming the custom-site/custom-date job.
  Proposed assertion strategy: Assert success notification and that an additional row referencing the chosen site/date range appears in `.logDataAnonymizer table`.

### Region: GDPR Tools — visitor finder & subject management (`?action=gdprTools`)
- `gdpr_tools_default`: `keep`
  Rationale: Single baseline for the empty-state Manage GDPR widget (segment match block + empty subjects table + helper copy). Sets the visual anchor for this region; all sibling screenshots are downstream state changes.
  Proposed assertion strategy: N/A
- `gdpr_tools_no_visits_found`: `replace`
  Rationale: Verifies the empty-result text after a search returns nothing. Copy/state assertion.
  Proposed assertion strategy: Assert that after the find, `.manageGdpr` shows the expected "no visitors found" message and the results table has zero data rows.
- `gdpr_tools_visits_found`: `replace`
  Rationale: Verifies that matching visits render in the entity table with the expected row count and per-row controls (visitor-log link, IP link, includes checkbox). Row-count and DOM-presence assertion.
  Proposed assertion strategy: Assert `.entityTable tbody tr` count > 0, that each row contains a `.visitorLogTooltip` and a `.visitorIp a`, and that `.checkInclude` checkboxes default to checked.
- `gdpr_tools_visits_showprofile`: `replace`
  Rationale: Test intent is "clicking the visitor-log link opens the visitor profile dialog". That is a dialog-open assertion. Pixel-diffing the entire `.ui-dialog` couples this PrivacyManager spec to the unrelated visitor-profile UI surface owned by another plugin.
  Proposed assertion strategy: Assert `.ui-dialog` becomes visible and contains expected visitor-profile structural markers (heading, summary block) without snapshotting the dialog body.
- `gdpr_tools_enrich_segment_by_ip`: `replace`
  Rationale: Test intent is "clicking the IP link adds an IP clause to the segment search input". State assertion on the segment input.
  Proposed assertion strategy: Assert that after clicking `.visitorIp a`, the metric-match-block input value contains the visitor IP and a corresponding result row is shown.
- `gdpr_tools_uncheck_one_visit`: `remove`
  Rationale: SHA-256 byte-identical to `gdpr_tools_delete_visit_cancelled` (verified). The unchecked-checkbox state is already covered by the cancellation test sequence; the bare unchecking action adds no distinct visual coverage and the behavioral check is trivial.
  Proposed assertion strategy: Assert the second-row `.checkInclude` checkbox becomes unchecked while sibling rows remain checked.
- `gdpr_tools_delete_visit_unconfirmed`: `replace`
  Rationale: Modal copy/buttons assertion — "are you sure you want to delete?" with Yes/No.
  Proposed assertion strategy: Assert `.modal.open` is visible and contains the expected confirmation copy and Yes/No buttons.
- `gdpr_tools_delete_visit_cancelled`: `remove`
  Rationale: Byte-identical to `gdpr_tools_uncheck_one_visit` (verified). The behavioral intent — "after No, modal closes and no rows were deleted" — is captured by the next test (`..._verified_no_data_deleted`) and by the asserted modal-closed state. No distinct visual coverage.
  Proposed assertion strategy: Assert the modal closed (`.modal.open` not present) and the entity-table row count is unchanged from before deletion.
- `gdpr_tools_delete_visit_cancelled_verified_no_data_deleted`: `replace`
  Rationale: Test intent is "after re-running the search, the same visits are still present" — a row-count / row-content assertion, not a layout test.
  Proposed assertion strategy: Re-issue the find and assert the entity-table row count and visitor-id values match the pre-cancellation set.
- `gdpr_tools_delete_visit_confirmed`: `replace`
  Rationale: After confirming Yes, the table shows the post-deletion state plus a success notification. State + count assertion.
  Proposed assertion strategy: Assert a success notification appears in `#notificationContainer` and the entity table row count drops by the expected amount (or the deleted visitor id is no longer present).
- `gdpr_tools_disabled_site`: `replace`
  Rationale: Test intent is "when the selected site has visitor logs/profiles disabled, the GDPR tool is hidden and a `dataUnavailable` message is shown instead". Presence/visibility assertion.
  Proposed assertion strategy: Assert `.manageGdpr .dataUnavailable strong` is visible with the expected message text and the search form is not present.
- `gdpr_tools_userid`: `replace`
  Rationale: Verifies that searching by a user id returns matching visits for a site that has logs/profiles enabled. Same row-presence assertion pattern as `gdpr_tools_visits_found`.
  Proposed assertion strategy: Assert at least one row appears in `.manageGdpr .entityTable tbody tr` whose displayed user id equals the searched value.

### Region: Compliance widget (`?action=compliance` and Privacy > Compliance menu)
- `compliance`: `keep`
  Rationale: The compliance page renders a structured policy table (`table.dataTable.compliance`) with status indicators per policy. One baseline screenshot anchors the visual layout of this region.
  Proposed assertion strategy: N/A
- `compliance_enforced`: `replace`
  Rationale: Test intent is "after enabling the cnil_v1 toggle and confirming password, the row reflects enforced state". Per-row state assertion.
  Proposed assertion strategy: Assert that after the save+confirm-password flow, the cnil_v1 row in the compliance table renders its enforced indicator/state and a success notification appears.
- `compliance_different_site`: `replace`
  Rationale: Test intent is "changing the site selector reloads the compliance content for that site" — asserted by row content change, not layout.
  Proposed assertion strategy: Assert the site selector display text reflects the newly chosen site and the compliance table re-renders (e.g. URL or per-site row data updated).
- `compliance_config_enabled`: `replace`
  Rationale: Test intent is "when `cnil_v1_policy_enabled=1` is set in config, the per-site enable checkbox/save controls are hidden and a config-controlled indicator is shown". Visibility/presence assertion.
  Proposed assertion strategy: Assert the per-site enableFeature checkbox and save button are not visible and the config-controlled marker (or its message) is present.

### Region: Sites Manager — site-specific privacy settings panel (PrivacyManager-injected)
- `show_settings`: `keep`
  Rationale: Single baseline of the plugin-injected per-site privacy editor as it appears when expanded inside Sites Manager. The panel is dense (multiple radios, dropdowns, help text per option) and the injected layout is plugin-owned. One representative is justified.
  Proposed assertion strategy: N/A
- `close_one_site_settings`: `replace`
  Rationale: Test intent is "clicking Cancel collapses the editor for that site only". Visibility/state assertion.
  Proposed assertion strategy: Assert the per-site privacy editor for site 3 is no longer rendered while site 1 remains expanded.
- `site_specific_settings_site1`: `replace`
  Rationale: Test intent is "selecting site-specific reveals the per-site override controls". Visibility/state assertion.
  Proposed assertion strategy: Assert `#useSiteSpecificSettings1site-specific` is selected and that the previously-hidden per-site override fields (mask length, anonymizeReferrer, etc.) are now visible inside `div[idsite="1"]`.
- `save_site_specific_settings_site1`: `replace`
  Rationale: Selector resolves to a notification-only screenshot (`#notificationContainer` after save). Pure success-message assertion.
  Proposed assertion strategy: Assert a success notification appears in `#notificationContainer` after Save and that no validation/error notification is present.
- `load_site_specific_settings_site1`: `keep`
  Rationale: This is the persistence-after-reload baseline of the per-site editor for the canonical site (site 1) showing every field type populated (toggles, mask radio, anonymizeReferrer dropdown, user/order id flags). Distinct visual coverage from `show_settings` because it asserts that values round-trip through save/reload, and it is the densest snapshot of the panel.
  Proposed assertion strategy: N/A
- `load_site_specific_settings_from_instance_for_site3`: `replace`
  Rationale: Test intent is "site-specific defaults inherit the current instance-level option values". That is a per-field value assertion driven by the seeded `optionsOverride`.
  Proposed assertion strategy: Assert that for site 3 each per-site control reflects the seeded instance values (mask length=1, useAnonymizedIp=on, anonymizeUserId=on, anonymizeOrderId=on, anonymizeReferrer=exclude_path, etc.).
- `load_site_specific_settings_from_instance_for_site2`: `remove`
  Rationale: SHA-256 byte-identical to `load_site_specific_settings_site2` (verified). It covers the same rendered region and same final values; the value-inheritance behavior is the same as the site 3 variant. Removing avoids duplication; the inheritance assertion is captured by the site 3 case.
  Proposed assertion strategy: Assert per-field values match the second seeded instance set (anonymizeReferrer=exclude_query, ipAnonymizerEnabled=off, etc.) — folded into the next test or the site 3 variant's assertion strategy.
- `save_site_specific_settings_site2`: `replace`
  Rationale: Same notification-only selector and intent as `save_site_specific_settings_site1`.
  Proposed assertion strategy: Assert a success notification appears in `#notificationContainer` after Save for site 2 and no error notification is present.
- `load_site_specific_settings_site2`: `replace`
  Rationale: Persistence-after-reload check for site 2; the same kind of round-trip is already kept as the canonical baseline (`load_site_specific_settings_site1`). Distinct visual value is low; per-site field round-trip is a value assertion.
  Proposed assertion strategy: Assert each per-site control inside `div[idsite="2"]` reflects the values written in the previous save test.
- `load_site_specific_settings_site2_compliance_info`: `replace`
  Rationale: Test intent is "when the cnil policy is enforced via config, the editor shows policy-controlled help text / disabled state on the affected fields". Presence/state assertion on compliance markers.
  Proposed assertion strategy: Assert that with `cnil_v1_policy_enabled=1`, the relevant per-field compliance helper markup (e.g. policy-controlled icon/text) is present for the policy-controlled fields and those fields are appropriately disabled.
- `no_privacy_settings_when_plugin_disabled`: `replace`
  Rationale: Test intent is "when PrivacyManager is unloaded, the privacy editor is not injected into Sites Manager". Pure absence assertion.
  Proposed assertion strategy: Assert that for site 1 in Sites Manager no PrivacyManager-owned editor selectors are present (e.g. `div[idsite="1"] .editingSiteFooter` referencing privacy fields, anonymize* radios) and that opening edit does not produce them.

## Confidence And Review Risk
- Confidence: `high`
- Review risk: The dense `.logDataAnonymizer` widget and the per-site privacy editor are visually rich; downgrading them aggressively could lose useful regression coverage. The plan keeps one screenshot baseline per region (`anonymizelogdata_anonymizeip_and_visit_column_prefilled` and `show_settings` / `load_site_specific_settings_site1`) precisely to mitigate that. A second risk is that some "replace" targets currently rely on a mix of `.pageWrap`, `#notificationContainer` and `.modal.open` selectors; the patch pass needs to be careful which container it queries (notification vs modal vs page) to avoid race conditions that the screenshot calls implicitly papered over with `waitForNetworkIdle`.

## Summary
PrivacyManager has 46 screenshot assertions across 3 specs, but the visual-only burden is concentrated in 5 plugin-owned regions: privacy settings form, log-data anonymizer widget, GDPR tools widget, compliance table, and the Sites Manager site-specific editor. Most assertions are state/copy/presence checks that reload baseline regions with one field changed — ideal `replace` candidates. Three byte-identical PNG pairs were detected and are high-confidence `remove` targets. Recommended retention: 6 screenshots (one per region, plus an extra reload-state baseline for the site-specific editor and one for the asking-for-consent help page). Net cleanup: 3 removes, 37 replaces, 6 keeps.

## Files That Would Change In A Later Patch Pass
- `plugins/PrivacyManager/tests/UI/PrivacyManager_spec.js`
- `plugins/PrivacyManager/tests/UI/PrivacyManager_SiteSpecific_spec.js`
- `plugins/PrivacyManager/tests/UI/PrivacyManager_ConsentManager_spec.js`
- `plugins/PrivacyManager/tests/UI/expected-screenshots/` (delete 40 PNGs; retain 6)

## Estimated Patch Size
- `Large`

## Implementation Plan (Per-Plugin)

Retained screenshots (keep set):
- `users_opt_out_default`
- `consent_default` (PrivacyManager_spec — the help page baseline)
- `privacy_settings_default`
- `anonymizelogdata_anonymizeip_and_visit_column_prefilled`
- `gdpr_tools_default`
- `compliance`
- `show_settings`
- `load_site_specific_settings_site1`

Replace first (low-risk, single-state copy/notification/value checks):
1. `understanding_your_legal_obligations`, `eprivacy_laws` — static-page text assertions.
2. `gdpr_overview`, `gdpr_overview_no_retention` — retention-text presence/absence.
3. `config_id_randomisation_on_password_required`, `config_id_randomisation_on`, `config_id_randomisation_off_password_not_required` — modal/state/notification.
4. `anonymizelogdata_*_confirmation_message`, `*_confirmed`, `*_prefilled` (non-baseline variants) — modal copy + jobs-table row deltas.
5. `gdpr_tools_no_visits_found`, `gdpr_tools_visits_found`, `gdpr_tools_userid`, `gdpr_tools_disabled_site`, `gdpr_tools_visits_showprofile`, `gdpr_tools_enrich_segment_by_ip`, `gdpr_tools_delete_visit_unconfirmed`, `gdpr_tools_delete_visit_cancelled_verified_no_data_deleted`, `gdpr_tools_delete_visit_confirmed` — all DOM/row/notification assertions.
6. `compliance_enforced`, `compliance_different_site`, `compliance_config_enabled` — per-row state and visibility.
7. `consent_default` from `PrivacyManager_ConsentManager_spec.js` — assert detected-consent-manager notice DOM.
8. SiteSpecific replaces: `close_one_site_settings`, `site_specific_settings_site1`, `save_site_specific_settings_site1`, `save_site_specific_settings_site2`, `load_site_specific_settings_site2`, `load_site_specific_settings_from_instance_for_site3`, `load_site_specific_settings_site2_compliance_info`, `no_privacy_settings_when_plugin_disabled`.

Remove outright (byte-identical duplicates):
- `anonymizelogdata_anonymizeip_and_visit_column_cancelled` (== prefilled)
- `gdpr_tools_uncheck_one_visit` (== gdpr_tools_delete_visit_cancelled)
- `gdpr_tools_delete_visit_cancelled` (== gdpr_tools_uncheck_one_visit; the cancel test becomes a behavioral assertion)
- `load_site_specific_settings_from_instance_for_site2` (== load_site_specific_settings_site2)

Safest file order for the patch pass:
1. `PrivacyManager_ConsentManager_spec.js` — only one assertion to change; quickest to verify in isolation.
2. `PrivacyManager_spec.js` — apply the static-page replaces first (`eprivacy_laws`, `understanding_your_legal_obligations`, `users_opt_out_default` keep, `consent_default` keep), then the GDPR overview pair, then the privacy-settings + anonymize-log-data subgroup (longest), then the GDPR tools subgroup, then the compliance subgroup. Validate after each subgroup using `tests:run-ui --plugin=PrivacyManager`.
3. `PrivacyManager_SiteSpecific_spec.js` — change in spec order so the dependent tests in the chain (save → load → compliance-info) keep running against a coherent state.

After all replaces are in, delete the 40 unused PNGs from `expected-screenshots/` in a single follow-up commit so any earlier failure is diff-isolated from the asset pruning.
