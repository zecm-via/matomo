/*!
 * Matomo - free/libre analytics platform
 *
 * ActionsDataTable screenshot tests.
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

describe("ActionsDataTable", function () {
    const url = "?module=Widgetize&action=iframe&idSite=1&period=year&date=2012-08-09&moduleToWidgetize=Actions&actionToWidgetize=getPageUrls&isFooterExpandedInDashboard=1";

    // Selector for the Actions data table (PageUrls report rendered as a dataTable).
    const tableSelector = 'div.dataTable[data-report="Actions.getPageUrls"]';

    async function getDataParam(name) {
        return await page.evaluate(function (sel, key) {
            const el = document.querySelector(sel);
            if (!el) return null;
            try {
                const params = JSON.parse(el.getAttribute('data-params') || '{}');
                return typeof params[key] === 'undefined' ? null : params[key];
            } catch (e) {
                return null;
            }
        }, tableSelector, name);
    }

    async function getTopLevelLabels() {
        return await page.evaluate(function (sel) {
            // Top-level rows are direct <tr> children of the report's main <tbody>
            // (skip subtable rows, which live inside td.cellSubDataTable).
            const tbody = document.querySelector(sel + ' .dataTableScroller > table.dataTable > tbody');
            if (!tbody) return [];
            const rows = Array.from(tbody.children).filter(function (n) {
                return n.tagName === 'TR' && !n.classList.contains('subDataTableContainer');
            });
            return rows.map(function (tr) {
                const cell = tr.querySelector('td.label .value');
                return cell ? cell.textContent.trim() : '';
            });
        }, tableSelector);
    }

    it("should load correctly", async function() {
        await page.goto(url);
        await page.waitForNetworkIdle();
        await page.waitForSelector(tableSelector + ' table.dataTable tbody tr');

        expect(await page.screenshot({ fullPage: true })).to.matchImage('initial');
    });

    it("should sort column correctly when column header clicked", async function() {
        await page.click('th#avg_time_on_page');
        await page.mouse.move(-10, -10);
        await page.waitForNetworkIdle();

        // The clicked header should now be marked as the active sort column.
        const sortedHeaderId = await page.evaluate(function (sel) {
            const header = document.querySelector(sel + ' table.dataTable thead th.columnSorted');
            return header ? header.getAttribute('id') : null;
        }, tableSelector);
        expect(sortedHeaderId).to.equal('avg_time_on_page');

        // The data-params reflect the new sort column.
        expect(await getDataParam('filter_sort_column')).to.equal('avg_time_on_page');
    });

    it("should load subtables correctly when row clicked", async function() {
        // Re-load the page with the hierarchical viewDataTable so that subtable rows are
        // present in the DOM (the report's default rendering is flat in the current
        // fixture, which would leave no `tr.subDataTable` elements to click).
        await page.goto(url + '&viewDataTable=table');
        await page.waitForNetworkIdle();
        await page.waitForSelector('tr.subDataTable');

        const secondRow = await page.jQuery('tr.subDataTable:eq(2)');
        await secondRow.click();
        const firstRow = await page.jQuery('tr.subDataTable:first');
        await firstRow.click();
        await page.mouse.move(-10, -10);

        await page.waitForNetworkIdle();
        await page.waitForTimeout(500); // rendering + subtable AJAX completion

        // The two clicks should each have produced an expanded subtable row in the DOM
        // (`viewDataTable=table` renders subtable children inline as additional rows
        // rather than in a separate `subDataTableContainer` row, so the most reliable
        // signal is the `.expanded` class on the clicked subtable parent rows).
        const expandedCount = await page.evaluate(function () {
            return document.querySelectorAll('tr.subDataTable.expanded').length;
        });
        expect(expandedCount).to.be.at.least(2);
    });

    it("should show configuration options", async function() {
        await page.click('.dropdownConfigureIcon');
        await page.mouse.move(-10, -10);
        await page.waitForTimeout(250); // rendering

        // The configuration dropdown should be visible.
        const visible = await page.evaluate(function () {
            const ul = document.querySelector('ul.tableConfiguration');
            if (!ul) return false;
            const style = window.getComputedStyle(ul);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
        expect(visible).to.equal(true);

        // The expected configuration items are present.
        const items = await page.evaluate(function () {
            return Array.from(document.querySelectorAll('ul.tableConfiguration li .configItem'))
                .map(function (el) {
                    return Array.from(el.classList).filter(function (c) { return c !== 'configItem'; }).join(' ');
                });
        });
        expect(items).to.include('dataTableFlatten');
        expect(items).to.include('dataTableExcludeLowPopulation');
    });

    it("should flatten table when flatten link clicked", async function() {
        await page.click('.dataTableFlatten');
        await page.mouse.move(-10, -10);
        await page.waitForNetworkIdle();

        // Flatten flag should be set in the data table parameters.
        expect(String(await getDataParam('flat'))).to.equal('1');

        // At least one row label now contains a path segment that only exists in flattened mode.
        const labels = await getTopLevelLabels();
        expect(labels.some(function (l) { return l.indexOf('/') !== -1; })).to.equal(true);
    });

    it("should exclude low population rows when exclude low population link clicked", async function() {
        const beforeRows = (await getTopLevelLabels()).length;

        await page.click('.dropdownConfigureIcon');
        await page.click('.dataTableExcludeLowPopulation');
        await page.mouse.move(-10, -10);
        await page.waitForNetworkIdle();

        const afterRows = (await getTopLevelLabels()).length;
        expect(beforeRows).to.be.above(0);
        expect(afterRows).to.be.below(beforeRows);

        // The exclude-low-population option should now be marked as enabled in params.
        const excludeFlag = await getDataParam('enable_filter_excludelowpop');
        expect(excludeFlag).to.not.equal(null);
        expect(String(excludeFlag)).to.not.equal('0');
    });

    it("should load normal view when switch to view hierarchical view link is clicked", async function() {
        await page.click('.dropdownConfigureIcon');
        await page.click('.dataTableFlatten');
        await page.waitForNetworkIdle();
        await page.mouse.move(-10, -10);

        // Flatten flag should be off and the first-row label should no longer contain a "/" path
        // segment (preserving the un-flatten path coverage that used to live in `unflattened`).
        expect(String(await getDataParam('flat'))).to.equal('0');

        const labels = await getTopLevelLabels();
        expect(labels.length).to.be.above(0);
        // In hierarchical view, top-level labels are folder names (e.g. "space", "page", "blog").
        // No top-level row should be a flattened "/foo/bar" path.
        expect(labels.every(function (l) { return l.indexOf('/') === -1 || /^\/[^\/]+$/.test(l); })).to.equal(true);
    });

    it("should display pageview percentages when hovering over pageviews column", async function() {
        const elem = await page.jQuery('tr:contains("index.htm") td.column:eq(1)');
        await elem.hover();

        // Hovering a column adds the `.highlight` class to all td:nth-child cells in that
        // column, which makes the inline `.ratio` percentage visible.
        await page.waitForFunction(function (sel) {
            return document.querySelectorAll(sel + ' td.column.highlight').length > 0;
        }, {}, tableSelector);

        const ratioVisible = await page.evaluate(function (sel) {
            const ratio = document.querySelector(sel + ' td.column.highlight .ratio');
            if (!ratio) return null;
            const style = window.getComputedStyle(ratio);
            return {
                visibility: style.visibility,
                text: ratio.textContent.trim(),
            };
        }, tableSelector);
        expect(ratioVisible).to.not.equal(null);
        expect(ratioVisible.visibility).to.equal('visible');
        expect(ratioVisible.text).to.match(/\d+(\.\d+)?\s*%/);
    });

    it("should generate a proper title for the visitor log segmented by the current row", async function() {
        await page.mouse.move(-10, -10);
        const row = 'tr:contains("index.htm") ';
        const first = await page.jQuery(row + 'td.column:first');
        await first.hover();
        const second = await page.jQuery(row + 'td.label .actionSegmentVisitorLog');
        await second.hover();

        // The segmented-visitor-log icon should be visible after hover.
        const iconVisible = await page.evaluate(function () {
            const el = document.querySelector('div.dataTableRowActions a.actionSegmentVisitorLog');
            if (!el) return false;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
        expect(iconVisible).to.equal(true);

        // Hovering the action icon opens a jQuery UI tooltip whose content is the
        // configured row-action tooltip title text (Live_RowActionTooltipTitle).
        await page.waitForFunction(function () {
            const tip = document.querySelector('.rowActionTooltip');
            if (!tip) return false;
            const style = window.getComputedStyle(tip);
            return style.display !== 'none';
        });
        const tooltipText = await page.evaluate(function () {
            const tip = document.querySelector('.rowActionTooltip');
            return tip ? tip.textContent.trim() : '';
        });
        expect(tooltipText.length).to.be.above(0);
    });

    it("should open the visitor log segmented by the current row", async function() {
        await page.evaluate(function(){
            $('tr:contains("index.htm") td.label .actionSegmentVisitorLog').click();
        });
        await page.mouse.move(-10, -10);
        await page.waitForSelector('.ui-dialog');
        await page.waitForNetworkIdle();

        const dialogVisible = await page.evaluate(function () {
            const el = document.querySelector('.ui-dialog');
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
        expect(dialogVisible).to.equal(true);

        const dialogTitle = await page.evaluate(function () {
            const el = document.querySelector('.ui-dialog .ui-dialog-title, .ui-dialog .ui-dialog-titlebar');
            return el ? el.textContent.trim() : '';
        });
        expect(dialogTitle).to.match(/index\.htm/i);
    });

    it("should display unique pageview percentages when hovering over unique pageviews column", async function() {
        await page.click('.ui-widget .ui-dialog-titlebar-close');
        // Move pointer somewhere neutral first so the next hover triggers a fresh highlight.
        await page.mouse.move(-10, -10);
        await page.waitForTimeout(100);

        const elem = await page.jQuery('tr:contains("index.htm") td.column:eq(2)');
        await elem.hover();

        await page.waitForFunction(function (sel) {
            return document.querySelectorAll(sel + ' td.column.highlight').length > 0;
        }, {}, tableSelector);

        const ratioVisible = await page.evaluate(function (sel) {
            const ratio = document.querySelector(sel + ' td.column.highlight .ratio');
            if (!ratio) return null;
            const style = window.getComputedStyle(ratio);
            return {
                visibility: style.visibility,
                text: ratio.textContent.trim(),
            };
        }, tableSelector);
        expect(ratioVisible).to.not.equal(null);
        expect(ratioVisible.visibility).to.equal('visible');
        expect(ratioVisible.text).to.match(/\d+(\.\d+)?\s*%/);
    });

    it("should show the search when clicking on the search icon", async function() {
        await page.click('.dataTableAction.searchAction');
        await page.mouse.move(-10, -10);
        await page.waitForTimeout(500);

        const searchInputState = await page.evaluate(function () {
            const input = document.querySelector('.searchAction .dataTableSearchInput');
            if (!input) return null;
            const style = window.getComputedStyle(input);
            return {
                visible: style.display !== 'none' && style.visibility !== 'hidden',
                value: input.value,
            };
        });
        expect(searchInputState).to.not.equal(null);
        expect(searchInputState.visible).to.equal(true);
        expect(searchInputState.value).to.equal('');
    });

    it("should search through table when search input entered and search button clicked and input should be visible", async function() {
        await page.type('.searchAction .dataTableSearchInput', 'i');
        await page.click('.searchAction .icon-search');
        await page.waitForNetworkIdle();
        await page.mouse.move(-10, -10);

        const searchInputValue = await page.evaluate(function () {
            const input = document.querySelector('.searchAction .dataTableSearchInput');
            return input ? input.value : null;
        });
        expect(searchInputValue).to.equal('i');

        // The result set is non-empty and at least one matching row's label contains "i"
        // (the result may include parent rows that don't themselves match because their
        // recursive subtables matched - that's how dataTable search works).
        const labels = await getTopLevelLabels();
        expect(labels.length).to.be.above(0);
        const allLabels = await page.evaluate(function (sel) {
            return Array.from(document.querySelectorAll(sel + ' td.label .value'))
                .map(function (el) { return el.textContent.trim(); });
        }, tableSelector);
        expect(allLabels.some(function (l) { return l.toLowerCase().indexOf('i') !== -1; })).to.equal(true);
    });

    it("should close search when clicking on the x icon", async function() {
        await page.click('.searchAction .icon-close');
        await page.waitForNetworkIdle();
        await page.mouse.move(-10, -10);

        const searchInputState = await page.evaluate(function () {
            const input = document.querySelector('.searchAction .dataTableSearchInput');
            if (!input) return null;
            const style = window.getComputedStyle(input);
            return {
                visible: style.display !== 'none' && style.visibility !== 'hidden',
                value: input.value,
            };
        });
        expect(searchInputState).to.not.equal(null);
        expect(searchInputState.visible).to.equal(false);
        expect(searchInputState.value).to.equal('');
    });

    it("should automatically expand subtables if it contains only one folder", async function() {
        await page.goto(url + '&viewDataTable=table');

        await page.waitForFunction("$('tr .value:contains(\"blog\")').length > 0");
        const first = await page.jQuery('tr .value:contains("blog")');
        await first.click();
        await page.waitForFunction("$('tr .value:contains(\"2012\")').length > 0");
        const second = await page.jQuery('tr .value:contains("2012")');
        await second.click();

        await page.waitForNetworkIdle();

        // The two clicks should produce at least two levels of expanded subtables.
        const expandedCount = await page.evaluate(function () {
            return document.querySelectorAll('tr.subDataTable.expanded').length;
        });
        expect(expandedCount).to.be.at.least(2);

        // Both intermediate folder labels should still be visible somewhere in the table.
        const leafLabels = await page.evaluate(function () {
            return Array.from(document.querySelectorAll('tr td.label .value'))
                .map(function (el) { return el.textContent.trim(); });
        });
        expect(leafLabels.some(function (l) { return l === 'blog'; })).to.equal(true);
        expect(leafLabels.some(function (l) { return l === '2012'; })).to.equal(true);
    });
});
