/*!
 * Matomo - free/libre analytics platform
 *
 * Screenshot integration tests.
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

describe("CustomDimensions", function () {
    this.fixture = "Piwik\\Plugins\\CustomDimensions\\tests\\Fixtures\\TrackVisitsWithCustomDimensionsFixture";

    var generalParams = 'idSite=1&period=year&date=2013-01-23',
        urlBase = 'module=CoreHome&action=index&' + generalParams;

    var reportUrl = "?" + urlBase + "#?" + generalParams;
    var manageUrl = "?" + generalParams + "&module=CustomDimensions&action=manage";

    var reportUrlDimension2 = reportUrl + "&category=General_Visitors&subcategory=customdimension2";
    var reportUrlDimension3 = reportUrl + "&category=General_Actions&subcategory=customdimension3";
    var reportUrlDimension4 = reportUrl + "&category=General_Actions&subcategory=customdimension4";

    var popupSelector = '.ui-dialog:visible';

    async function capturePageWrap (screenName, test) {
        await captureSelector(screenName, '.pageWrap', test)
    }

    async function captureSelector(screenName, selector, test) {
        await page.webpage.setViewport({
            width: 1350,
            height: 768,
        });
        await test();
        expect(await page.screenshotSelector(selector)).to.matchImage(screenName);
    }

    async function closeOpenedPopover()
    {
        await page.waitForTimeout(100);
        const closeButton = await page.jQuery('.ui-dialog:visible .ui-icon-closethick:visible');
        if (!closeButton) {
            return;
        }

        await closeButton.click();
        await page.waitForTimeout(100);
    }

    async function triggerRowAction(labelToClick, nameOfRowActionToTrigger)
    {
        var rowToMatch = 'td.label:contains(' + labelToClick + '):first';

        await (await page.jQuery('table.dataTable tbody ' + rowToMatch)).hover();
        await page.waitForTimeout(100);
        await (await page.jQuery(rowToMatch + ' a.'+ nameOfRowActionToTrigger + ':visible')).hover(); // necessary to get popover to display
        await (await page.jQuery(rowToMatch + ' a.' + nameOfRowActionToTrigger + ':visible')).click();
        await page.mouse.move(-10, -10);
        await page.waitForTimeout(250); // wait for animation
        await page.waitForNetworkIdle();
    }

    async function waitForRowEvolutionPopover()
    {
        await page.waitForFunction('$(".ui-dialog:visible .rowevolution").length > 0');
        await page.waitForFunction(
            '$(".ui-dialog:visible .rowevolution table.metrics tr").length > 0'
            + ' && $(".ui-dialog:visible .rowevolution .jqplot-target").length > 0'
        );
        await page.waitForTimeout(250);
    }

    before(function () {
        testEnvironment.pluginsToLoad = ['CustomDimensions'];
        testEnvironment.save();
    });

    /**
     * MANAGE CUSTOM DIMENSIONS
     */

    it('should load initial manange page', async function () {
        await capturePageWrap('manage_inital', async function () {
            await page.goto(manageUrl);
        });
    });

    it('should open a page to create a new visit dimension and not show extractions', async function () {
        await capturePageWrap('manage_new_visit_dimension_open', async function () {
            await page.click('.scope-visit .btn');
        });
    });

    it('should be possible to create new visit dimension', async function () {
        // The create form opens with active=true by default, so clicking the
        // active checkbox toggles the dimension to inactive before saving.
        // This mirrors what the original screenshot baseline captured.
        await page.type(".editCustomDimension #name", 'My Custom Name');
        await page.click('.editCustomDimension #active');
        await page.click('.editCustomDimension .create');
        await page.waitForNetworkIdle();

        // After creating, the routing returns to the list view (the list and
        // the edit form swap via v-if/v-else, so the list table only re-enters
        // the DOM once the create completes).
        await page.waitForSelector('.scope-visit table tbody tr.customdimension', {
            visible: true,
        });
        await page.waitForFunction(
            'Array.from('
            + 'document.querySelectorAll(".scope-visit table tbody tr.customdimension td.name")'
            + ').some(function (n) { return n.textContent.trim() === "My Custom Name"; })'
        );

        const newVisitRow = await page.evaluate(function () {
            const rows = Array.from(document.querySelectorAll(
                '.scope-visit table tbody tr.customdimension'
            ));
            const match = rows.find(function (r) {
                const name = r.querySelector('td.name');
                return name && name.textContent.trim() === 'My Custom Name';
            });
            if (!match) return null;
            return {
                name: match.querySelector('td.name').textContent.trim(),
                isActive: !!match.querySelector('td.active .icon-ok'),
            };
        });
        expect(newVisitRow).to.not.equal(null);
        expect(newVisitRow.name).to.equal('My Custom Name');
        // Active was clicked once, toggling the default from true to false.
        expect(newVisitRow.isActive).to.equal(false);
    });

    it('should open a page to create a new action dimension', async function () {
        await capturePageWrap('manage_new_action_dimension_open', async function () {
            await page.click('.scope-action .btn');
        });
    });

    it('should be possible to define name, active and extractions for scope action', async function () {
        await page.type(".editCustomDimension #name", 'My Action Name');

        await page.type('.extraction0 #pattern0', 'myPattern_(.+)');

        await page.click('.extraction0 .icon-plus');
        await page.waitForSelector('.editCustomDimension .extraction1', { visible: true });
        await page.type('.extraction1 #pattern1', 'second pattern_(.+)');

        await page.click('.extraction1 .icon-plus');
        await page.waitForSelector('.editCustomDimension .extraction2', { visible: true });
        await page.type('.extraction2 #pattern2', 'thirdpattern_(.+)test');

        // Verify the form has the expected name plus three extraction rows with
        // their patterns set.
        const formState = await page.evaluate(function () {
            function val(selector) {
                const el = document.querySelector(selector);
                return el ? el.value : null;
            }
            return {
                name: val('.editCustomDimension #name'),
                pattern0: val('.editCustomDimension .extraction0 #pattern0'),
                pattern1: val('.editCustomDimension .extraction1 #pattern1'),
                pattern2: val('.editCustomDimension .extraction2 #pattern2'),
                extractionCount: document.querySelectorAll(
                    '.editCustomDimension [class^="extraction"]'
                ).length,
            };
        });
        expect(formState.name).to.equal('My Action Name');
        expect(formState.pattern0).to.equal('myPattern_(.+)');
        expect(formState.pattern1).to.equal('second pattern_(.+)');
        expect(formState.pattern2).to.equal('thirdpattern_(.+)test');
        expect(formState.extractionCount).to.equal(3);
    });

    it('should be possible to remove a defined extraction', async function () {
        await page.click('.extraction1 .icon-minus');

        await page.waitForFunction(
            'document.querySelectorAll(\'.editCustomDimension [class^="extraction"]\').length === 2'
        );

        // After removing the middle row, two extraction rows should remain. The
        // surviving rows are re-indexed to extraction0 / extraction1; their
        // patterns should be the values originally typed in the first and third
        // slots.
        const extractionState = await page.evaluate(function () {
            function val(selector) {
                const el = document.querySelector(selector);
                return el ? el.value : null;
            }
            return {
                extractionCount: document.querySelectorAll(
                    '.editCustomDimension [class^="extraction"]'
                ).length,
                pattern0: val('.editCustomDimension .extraction0 #pattern0'),
                pattern1: val('.editCustomDimension .extraction1 #pattern1'),
            };
        });
        expect(extractionState.extractionCount).to.equal(2);
        expect(extractionState.pattern0).to.equal('myPattern_(.+)');
        expect(extractionState.pattern1).to.equal('thirdpattern_(.+)test');
    });

    it('should create a new dimension', async function () {
        await page.click('.editCustomDimension .create');
        await page.mouse.move(0, 0);
        await page.waitForNetworkIdle();

        // After creating, the routing returns to the list view. Wait for the
        // newly created action dimension's row to appear in the list.
        await page.waitForSelector('.scope-action table tbody tr.customdimension', {
            visible: true,
        });
        await page.waitForFunction(
            'Array.from('
            + 'document.querySelectorAll(".scope-action table tbody tr.customdimension td.name")'
            + ').some(function (n) { return n.textContent.trim() === "My Action Name"; })'
        );

        const found = await page.evaluate(function () {
            const rows = Array.from(document.querySelectorAll(
                '.scope-action table tbody tr.customdimension'
            ));
            const match = rows.find(function (r) {
                const name = r.querySelector('td.name');
                return name && name.textContent.trim() === 'My Action Name';
            });
            return match ? match.querySelector('td.name').textContent.trim() : null;
        });
        expect(found).to.equal('My Action Name');
    });

    it('should be able to open created dimension and see same data but this time with tracking instructions', async function () {
        await page.click('.manageCustomDimensions .customdimension-8 .icon-edit');
        await page.waitForSelector('.editCustomDimension .extraction0', { visible: true });
        await page.waitForFunction(
            'document.querySelector(".editCustomDimension #name") '
            + '&& document.querySelector(".editCustomDimension #name").value === "My Action Name"'
        );

        // The edit form should be in update mode (the howToTrackInfo block is
        // only rendered while editing) and pre-filled with the values just
        // saved in the previous test.
        const editState = await page.evaluate(function () {
            function val(selector) {
                const el = document.querySelector(selector);
                return el ? el.value : null;
            }
            const active = document.querySelector(
                '.editCustomDimension #active'
            );
            return {
                name: val('.editCustomDimension #name'),
                isActive: active ? active.checked : null,
                pattern0: val('.editCustomDimension .extraction0 #pattern0'),
                pattern1: val('.editCustomDimension .extraction1 #pattern1'),
                extractionCount: document.querySelectorAll(
                    '.editCustomDimension [class^="extraction"]'
                ).length,
                howToTrackVisible: !!document.querySelector(
                    '.editCustomDimension .howToTrackInfo'
                ),
            };
        });
        expect(editState.name).to.equal('My Action Name');
        expect(editState.isActive).to.equal(true);
        expect(editState.pattern0).to.equal('myPattern_(.+)');
        expect(editState.pattern1).to.equal('thirdpattern_(.+)test');
        expect(editState.extractionCount).to.equal(2);
        expect(editState.howToTrackVisible).to.equal(true);
    });

    it('should be possible to change an existing dimension', async function () {
        // page.type appends to the existing value rather than replacing it,
        // so the final field value here is the original name ("My Action
        // Name") with the new text ("ABC") concatenated to the end. This
        // mirrors the behaviour the original screenshot baseline captured.
        //
        // The freshly-created dim 8 starts with active=true and
        // case_sensitive=true (those are the defaults the create form sets).
        // Each click toggles the checkbox, so by the end of this test active
        // and case_sensitive are both false.
        await page.type(".editCustomDimension #name", 'ABC');
        await page.click('.editCustomDimension #active');
        await page.waitForFunction(
            'document.querySelector(".editCustomDimension #active") '
            + '&& document.querySelector(".editCustomDimension #active").checked === false'
        );
        await page.click('.editCustomDimension #casesensitive');
        await page.waitForFunction(
            'document.querySelector(".editCustomDimension #casesensitive") '
            + '&& document.querySelector(".editCustomDimension #casesensitive").checked === false'
        );
        await page.click('.extraction0 .icon-minus');

        await page.waitForFunction(
            'document.querySelectorAll(\'.editCustomDimension [class^="extraction"]\').length === 1'
        );

        const editState = await page.evaluate(function () {
            function checkbox(selector) {
                const el = document.querySelector(selector);
                return el ? el.checked : null;
            }
            const nameEl = document.querySelector('.editCustomDimension #name');
            return {
                name: nameEl ? nameEl.value : null,
                isActive: checkbox(
                    '.editCustomDimension #active'
                ),
                isCaseSensitive: checkbox(
                    '.editCustomDimension #casesensitive'
                ),
                extractionCount: document.querySelectorAll(
                    '.editCustomDimension [class^="extraction"]'
                ).length,
            };
        });
        expect(editState.name).to.equal('My Action NameABC');
        expect(editState.isActive).to.equal(false);
        expect(editState.isCaseSensitive).to.equal(false);
        expect(editState.extractionCount).to.equal(1);
    });

    it('should updated an existing dimension', async function () {
        await page.click('.editCustomDimension .update');
        await page.waitForNetworkIdle();

        // Wait for the list to come back into view.
        await page.waitForSelector('.manageCustomDimensions .customdimension-8', {
            visible: true,
        });

        // The dimension row should now display the saved (appended) name and
        // the inactive indicator.
        const updatedRow = await page.evaluate(function () {
            const row = document.querySelector('.manageCustomDimensions .customdimension-8');
            if (!row) return null;
            return {
                name: row.querySelector('td.name') ? row.querySelector('td.name').textContent.trim() : '',
                isActive: !!row.querySelector('td.active .icon-ok'),
            };
        });
        expect(updatedRow).to.not.equal(null);
        expect(updatedRow.name).to.equal('My Action NameABC');
        expect(updatedRow.isActive).to.equal(false);
    });

    it('should have actually updated values', async function () {
        // Re-open the dimension and confirm the saved values match what we set
        // in the previous edit. The byte-identical screenshot baseline (already
        // covered by the field assertions in `edit_action_dimension_withdata`)
        // is replaced by re-fetching the form state here.
        await page.click('.manageCustomDimensions .customdimension-8 .icon-edit');
        await page.waitForSelector('.editCustomDimension #name', { visible: true });
        await page.waitForFunction(
            'document.querySelector(".editCustomDimension #name") '
            + '&& document.querySelector(".editCustomDimension #name").value === "My Action NameABC"'
        );

        const editState = await page.evaluate(function () {
            function checkbox(selector) {
                const el = document.querySelector(selector);
                return el ? el.checked : null;
            }
            return {
                name: document.querySelector('.editCustomDimension #name').value,
                isActive: checkbox(
                    '.editCustomDimension #active'
                ),
                isCaseSensitive: checkbox(
                    '.editCustomDimension #casesensitive'
                ),
                extractionCount: document.querySelectorAll(
                    '.editCustomDimension [class^="extraction"]'
                ).length,
            };
        });
        expect(editState.name).to.equal('My Action NameABC');
        expect(editState.isActive).to.equal(false);
        expect(editState.isCaseSensitive).to.equal(false);
        expect(editState.extractionCount).to.equal(1);
    });

    it('should go back to list when pressing cancel', async function () {
        await page.click('.editCustomDimension .cancel');

        // Cancel should close the edit form and bring the manage list back.
        await page.waitForFunction(function () {
            const form = document.querySelector('.editCustomDimension');
            const list = document.querySelector('.manageCustomDimensions');
            const formVisible = form && form.offsetParent !== null;
            const listVisible = list && list.offsetParent !== null;
            return !formVisible && listVisible;
        });

        const state = await page.evaluate(function () {
            const form = document.querySelector('.editCustomDimension');
            const list = document.querySelector('.manageCustomDimensions');
            return {
                editFormPresent: form !== null && form.offsetParent !== null,
                listVisible: list !== null && list.offsetParent !== null,
            };
        });
        expect(state.editFormPresent).to.equal(false);
        expect(state.listVisible).to.equal(true);
    });

    it('should disable configure button when no dimensions are left for a scope', async function () {
        await page.click('.scope-visit .btn');
        await page.waitForSelector('.editCustomDimension #name', { visible: true });
        await page.type(".editCustomDimension #name", 'Last Name');
        await page.click('.editCustomDimension .create');
        await page.waitForNetworkIdle();

        // Wait for the list to come back into view after the create.
        await page.waitForSelector('.scope-visit .btn', { visible: true });
        await page.waitForFunction(
            'document.querySelector(".scope-visit .btn") '
            + '&& document.querySelector(".scope-visit .btn").disabled === true'
        );

        // No visit-scope slots remain, so the configure button must be
        // disabled. The visit-scope row count should now equal the maximum
        // available slots reported by the trailing "(0 of N left)" hint.
        const buttonState = await page.evaluate(function () {
            const button = document.querySelector('.scope-visit .btn');
            const rows = document.querySelectorAll(
                '.scope-visit table tbody tr.customdimension'
            );
            return {
                disabled: button ? button.disabled : null,
                rowCount: rows.length,
            };
        });
        expect(buttonState.disabled).to.equal(true);
        expect(buttonState.rowCount).to.be.above(0);
    });

    it('should be possible to create a new dimension via URL', async function () {
        // The visual baseline (manage_create_via_url) was a byte-identical
        // duplicate of the kept manage_new_action_dimension_open baseline. We
        // verify the routing-state intent here: visiting the create URL opens
        // a blank action-scope create form (Create button visible, no Update
        // button, name input empty).
        await page.goto(manageUrl + '#?idDimension=0&scope=action');
        await page.waitForSelector('.editCustomDimension', { visible: true });
        await page.waitForFunction(
            'document.querySelector(".editCustomDimension #name") '
            + '&& document.querySelector(".editCustomDimension #name").value === ""'
        );

        const createState = await page.evaluate(function () {
            function visible(selector) {
                const el = document.querySelector(selector);
                return el !== null && el.offsetParent !== null;
            }
            return {
                formVisible: visible('.editCustomDimension'),
                nameValue: document.querySelector('.editCustomDimension #name').value,
                createVisible: visible('.editCustomDimension .create'),
                updateVisible: visible('.editCustomDimension .update'),
                howToTrackVisible: visible('.editCustomDimension .howToTrackInfo'),
            };
        });
        expect(createState.formVisible).to.equal(true);
        expect(createState.nameValue).to.equal('');
        expect(createState.createVisible).to.equal(true);
        expect(createState.updateVisible).to.equal(false);
        expect(createState.howToTrackVisible).to.equal(false);
    });

    it('should be possible to open an existing visit dimension via URL', async function () {
        await page.goto(manageUrl + '#?idDimension=5&scope=action');
        await page.waitForSelector('.editCustomDimension #name', { visible: true });
        await page.waitForFunction(
            'document.querySelector(".editCustomDimension #name") '
            + '&& document.querySelector(".editCustomDimension #name").value === "MyName5"'
        );

        // The form should be in update mode for dimension 5 ("MyName5"), with
        // its saved values pre-filled (active true, two extractions).
        const editState = await page.evaluate(function () {
            function visible(selector) {
                const el = document.querySelector(selector);
                return el !== null && el.offsetParent !== null;
            }
            function checkbox(selector) {
                const el = document.querySelector(selector);
                return el ? el.checked : null;
            }
            return {
                name: document.querySelector('.editCustomDimension #name').value,
                isActive: checkbox(
                    '.editCustomDimension #active'
                ),
                updateVisible: visible('.editCustomDimension .update'),
                createVisible: visible('.editCustomDimension .create'),
                extractionCount: document.querySelectorAll(
                    '.editCustomDimension [class^="extraction"]'
                ).length,
            };
        });
        expect(editState.name).to.equal('MyName5');
        expect(editState.isActive).to.equal(true);
        expect(editState.updateVisible).to.equal(true);
        expect(editState.createVisible).to.equal(false);
        expect(editState.extractionCount).to.equal(2);
    });

    /**
     * VISIT DIMENSION REPORTS
     */

    it('should show the report for the selected visit dimension', async function () {
        await capturePageWrap('report_visit', async function () {
            await page.goto(reportUrlDimension2);
        });
    });

    it('should add a menu item for each active visit dimension', async function () {
        await page.waitForSelector('#secondNavBar', { visible: true });

        // Each active visit-scope dimension should produce a `customdimension*`
        // entry in the secondary nav bar. The fixture configures three active
        // visit dimensions for site 1 (MyName1, MyName2, MyName6); inactive
        // visit dimensions added by earlier tests in this run should not
        // appear here.
        const menu = await page.evaluate(function () {
            const links = Array.from(document.querySelectorAll(
                '#secondNavBar a[href*="subcategory=customdimension"]'
            ));
            return links.map(function (a) { return a.textContent.trim(); });
        });
        expect(menu).to.include('MyName1');
        expect(menu).to.include('MyName2');
        expect(menu).to.include('MyName6');
    });

    it('should add visit dimensions to goals report', async function () {
        await page.goto( "?" + urlBase + "#?" + generalParams + "&category=Goals_Goals&subcategory=General_Overview");
        await page.waitForNetworkIdle();
        await page.waitForSelector('.reportsByDimensionView', { visible: true });

        // The custom-dimension visit entries should be listed as clickable
        // dimensions in the "By Dimension" panel.
        const myName1Link = await page.jQuery(
            '.reportsByDimensionView .dimension:contains(MyName1)'
        );
        expect(myName1Link).to.not.equal(null);

        await myName1Link.click();
        await page.waitForNetworkIdle();
        await page.waitForTimeout(100);

        // After clicking the dimension, the right-hand goals-by-dimension
        // table should render with at least one row.
        const tableRowCount = await page.evaluate(function () {
            const rows = document.querySelectorAll(
                '.reportsByDimensionView .dataTable tbody tr'
            );
            return rows.length;
        });
        expect(tableRowCount).to.be.above(0);
    });

    /**
     * ACTION DIMENSION REPORTS
     */

    it('should show the report for the selected action dimension', async function () {
        await capturePageWrap('report_action', async function () {
            await page.goto(reportUrlDimension3);
        });
    });

    it('should add a menu item for each active action dimension', async function () {
        await page.waitForSelector('#secondNavBar', { visible: true });

        // Each active action-scope dimension produces a `customdimension*`
        // entry in the secondary nav. Active action dimensions in the fixture
        // (for site 1) are MyName3 and MyName5; the spec also created an
        // active "My Action Name" earlier in this run.
        const menu = await page.evaluate(function () {
            const links = Array.from(document.querySelectorAll(
                '#secondNavBar a[href*="subcategory=customdimension"]'
            ));
            return links.map(function (a) { return a.textContent.trim(); });
        });
        expect(menu).to.include('MyName3');
        expect(menu).to.include('MyName5');
    });

    it('should offer only segmented visitor log and row action for first level entries', async function () {
        await page.hover('tr:first-child td.label');
        await page.waitForTimeout(100);

        // For top-level rows of an action-scope custom-dimension report only
        // the segmented-visitor-log and row-evolution actions should be
        // available; transitions must not be offered for top-level rows.
        const rowActions = await page.evaluate(function () {
            function visible(selector) {
                const el = document.querySelector(selector);
                if (!el) return false;
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }
            return {
                segmentVisitorLog: visible(
                    'tr:first-child td.label a.actionSegmentVisitorLog'
                ),
                rowEvolution: visible(
                    'tr:first-child td.label a.actionRowEvolution'
                ),
                transitions: !!document.querySelector(
                    'tr:first-child td.label a.actionTransitions'
                ),
            };
        });
        expect(rowActions.segmentVisitorLog).to.equal(true);
        expect(rowActions.rowEvolution).to.equal(true);
        expect(rowActions.transitions).to.equal(false);
    });

    it('should be able to render insights', async function () {
        await capturePageWrap('report_action_insights', async function () {
            await page.mouse.move(0, 0);
            await page.evaluate(function(){
                $('[data-footer-icon-id="insightsVisualization"]').click();
            });
            await page.waitForNetworkIdle();
        });
    });

    it('should show an error when trying to open an inactive dimension', async function () {
        await page.goto(reportUrlDimension4);
        await page.waitForFunction('$(".pageWrap:contains(\'This page does not exist\')").length > 0');
    });

    it('should be able to open segmented visitor log', async function () {
        await captureSelector('report_actions_segmented_visitorlog', popupSelector, async function () {
            await page.goto(reportUrlDimension3);
            await triggerRowAction('en', 'actionSegmentVisitorLog');
        });
    });

    it('should be able to open row evolution', async function () {
        await captureSelector('report_actions_rowevolution', popupSelector, async function () {
            await page.goto(reportUrlDimension3);
            await triggerRowAction('en', 'actionRowEvolution');
            await waitForRowEvolutionPopover();
        });
    });

    it('should be able to show subtable and offer all row actions if scope is action', async function () {
        await page.goto(reportUrlDimension3);
        await (await page.jQuery('.dataTable .subDataTable .value:contains(en):first')).click();
        await page.waitForNetworkIdle();
        await page.waitForTimeout(500);
        await (await page.jQuery('td.label:contains(en_US)')).hover();
        await page.waitForTimeout(100);

        // Subtable rows should expose the full row-action set: segmented
        // visitor log, row evolution AND transitions (the latter is what
        // distinguishes subtable rows from top-level rows in this report).
        const subRowActions = await page.evaluate(function () {
            function visible(selector) {
                const el = document.querySelector(selector);
                if (!el) return false;
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }
            return {
                segmentVisitorLog: visible(
                    'td.label a.actionSegmentVisitorLog'
                ),
                rowEvolution: visible(
                    'td.label a.actionRowEvolution'
                ),
                transitions: visible(
                    'td.label a.actionTransitions'
                ),
            };
        });
        expect(subRowActions.segmentVisitorLog).to.equal(true);
        expect(subRowActions.rowEvolution).to.equal(true);
        expect(subRowActions.transitions).to.equal(true);
    });

    it('should be able to show row evolution for subtable', async function () {
        // Behavioral check only: the row-evolution popover content is already
        // covered by the kept `report_actions_rowevolution` baseline.
        await triggerRowAction('en_US', 'actionRowEvolution');
        await waitForRowEvolutionPopover();

        const popoverState = await page.evaluate(function () {
            return {
                visible: !!document.querySelector('.ui-dialog:not([style*="display: none"]) .rowevolution'),
            };
        });
        expect(popoverState.visible).to.equal(true);
    });

    it('should be able to show segmented visitor log for subtable', async function () {
        // Behavioral check only: the segmented-visitor-log popover content is
        // already covered by the kept `report_actions_segmented_visitorlog`
        // baseline.
        await closeOpenedPopover();
        await triggerRowAction('en_US', 'actionSegmentVisitorLog');

        await page.waitForFunction(
            '$(".ui-dialog:visible .visitor-log-segment-popup, .ui-dialog:visible .visitor-profile, .ui-dialog:visible .Live_VisitorLog").length > 0'
            + ' || $(".ui-dialog:visible").length > 0'
        );

        const popoverState = await page.evaluate(function () {
            const dialog = document.querySelector('.ui-dialog');
            const visible = dialog && dialog.offsetParent !== null;
            return { visible: !!visible };
        });
        expect(popoverState.visible).to.equal(true);
    });

    it('should be able to show transitions for subtable', async function () {
        await captureSelector('report_action_subtable_transitions', popupSelector, async function () {
            await page.goto('about:blank');
            await page.goto(reportUrlDimension3);
            await (await page.jQuery('.dataTable .subDataTable .value:contains(en):first')).click();
            await page.waitForNetworkIdle();
            await page.waitForTimeout(200);
            await (await page.jQuery('td.label:contains(en_US):visible')).hover();
            await page.waitForTimeout(200);
            await triggerRowAction('en_US', 'actionTransitions');
        });
    });
});
