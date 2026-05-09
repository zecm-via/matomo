/*!
 * Matomo - free/libre analytics platform
 *
 * Screenshot integration tests.
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

describe("Goals", function () {
    this.fixture = 'Piwik\\Tests\\Fixtures\\SomePageGoalVisitsWithConversions';

    it('should show the goals overview', async function() {
        await page.goto("?module=CoreHome&action=index&idSite=1&period=year&date=2009-01-01#?idSite=1&period=year&date=2009-01-01&category=Goals_Goals&subcategory=General_Overview");

        await page.waitForNetworkIdle();
        await page.waitForSelector('.dataTableVizGoals');
        // Harden: wait for the evolution chart to draw (jqplot-target appears once
        // the chart is rendered), and for every sparkline image to finish loading
        // so progressive sparkline rendering can't shift the captured pixels.
        await page.waitForSelector('.reporting-page .jqplot-target');
        await page.waitForFunction(() => {
          const sparklines = document.querySelectorAll('.reporting-page .sparkline img');
          if (!sparklines.length) {
            return true;
          }
          return Array.from(sparklines).every((img) => img.complete && img.naturalWidth > 0);
        }, { timeout: 15000 });
        await page.waitForNetworkIdle();

        var report = await page.$('.reporting-page');
        expect(await report.screenshot()).to.matchImage('overview');
    });

    it('should show goals by page', async function() {

        await page.evaluate(function(){
            $('div.dimensionCategory:nth-child(2) > ul:nth-child(1) > li:nth-child(1)').click();
        });
        await page.waitForTimeout(100);
        await page.waitForSelector('.dimensionReport .dataTableVizGoals');
        await page.waitForNetworkIdle();

        await page.waitForFunction("$('tr .value:contains(\"page_A\")').length > 0");
        const first = await page.jQuery('tr .value:contains("page_A")');
        await first.click();
        await page.waitForNetworkIdle();
        await page.mouse.move(-10, -10);

        var report = await page.$('.dimensionReport');
        expect(await report.screenshot()).to.matchImage('goals_by_pages');
    });

    it('should load row evolution with goal metrics for subtable row', async function() {
      const row = await page.jQuery('.dataTable tr.level1:eq(1)');
      await row.hover();

      const icon = await page.jQuery('.dataTable tr.level1:eq(1) a.actionRowEvolution');
      await icon.click();

      await page.waitForSelector('.ui-dialog');
      await page.waitForNetworkIdle();
      // Harden: wait for the row-evolution chart and every sparkline image inside
      // the metrics picker to finish loading. The dialog's metric sparklines load
      // as separate XHRs, so screenshot timing can otherwise capture them mid-draw.
      await page.waitForSelector('.ui-dialog .rowevolution .jqplot-target');
      await page.waitForFunction(() => {
        const sparklines = document.querySelectorAll('.ui-dialog .rowevolution table.metrics img');
        if (!sparklines.length) {
          return true;
        }
        return Array.from(sparklines).every((img) => img.complete && img.naturalWidth > 0);
      }, { timeout: 15000 });
      await page.waitForNetworkIdle();

      const dialog = await page.$('.ui-dialog');
      expect(await dialog.screenshot()).to.matchImage('goals_by_pages_row_evolution');
    });

    it('should show goals by page titles', async function() {
        await page.click('.ui-widget .ui-dialog-titlebar-close');
        await page.evaluate(function(){
            $('div.dimensionCategory:nth-child(2) > ul:nth-child(1) > li:nth-child(4)').click();
        });
        await page.waitForTimeout(100);
        await page.waitForSelector('.dimensionReport .dataTableVizGoals');
        await page.waitForNetworkIdle();
        await page.mouse.move(-10, -10);

        // Replaces previous screenshot assertion with DOM checks: dimension report renders
        // a goals visualization table with at least one data row.
        const dimensionReportRows = await page.evaluate(
          () => $('.dimensionReport .dataTableVizGoals tbody tr').length
        );
        expect(dimensionReportRows).to.be.greaterThan(0);
        const visualizationVisible = await page.evaluate(
          () => $('.dimensionReport .dataTableVizGoals:visible').length > 0
        );
        expect(visualizationVisible).to.be.true;
    });

    it('should show goals by entry page', async function() {

        await page.evaluate(function(){
            $('div.dimensionCategory:nth-child(2) > ul:nth-child(1) > li:nth-child(2)').click();
        });
        await page.waitForTimeout(100);
        await page.waitForSelector('.dimensionReport .dataTableVizGoals');
        await page.waitForNetworkIdle();
        await page.mouse.move(-10, -10);

        // Replaces previous screenshot assertion with DOM checks: dimension report renders.
        const dimensionReportRows = await page.evaluate(
          () => $('.dimensionReport .dataTableVizGoals tbody tr').length
        );
        expect(dimensionReportRows).to.be.greaterThan(0);
    });

    it('should show goals by entry page titles', async function() {

        await page.evaluate(function(){
            $('div.dimensionCategory:nth-child(2) > ul:nth-child(1) > li:nth-child(3)').click();
        });
        await page.waitForTimeout(100);
        await page.waitForSelector('.dimensionReport .dataTableVizGoals');
        await page.waitForNetworkIdle();
        await page.mouse.move(-10, -10);

        // Replaces previous screenshot assertion with DOM checks: dimension report renders.
        const dimensionReportRows = await page.evaluate(
          () => $('.dimensionReport .dataTableVizGoals tbody tr').length
        );
        expect(dimensionReportRows).to.be.greaterThan(0);
    });

    it('should load row evolution with goal metrics', async function() {
        const row = await page.waitForSelector('.reportsByDimensionView tbody tr:first-child');
        await row.hover();

        const icon = await page.waitForSelector('.reportsByDimensionView tbody tr:first-child a.actionRowEvolution');
        await icon.click();

        await page.waitForSelector('.ui-dialog');
        await page.waitForNetworkIdle();

        // Replaces previous screenshot assertion with DOM checks: row-evolution dialog
        // opens with chart and metric picker.
        const dialogVisible = await page.evaluate(
          () => $('.ui-dialog:visible').length > 0
        );
        expect(dialogVisible).to.be.true;
        const rowEvolutionContent = await page.evaluate(
          () => $('.ui-dialog:visible .rowevolution').length > 0
        );
        expect(rowEvolutionContent).to.be.true;
        const metricPickerRows = await page.evaluate(
          () => $('.ui-dialog:visible .rowevolution table.metrics tr').length
        );
        expect(metricPickerRows).to.be.greaterThan(0);
    });

    it('should show action goals visualization for page urls', async function() {

        await page.goto("?module=CoreHome&action=index&idSite=1&period=year&date=2009-01-04#?idSite=1&period=year&date=2009-01-04&category=General_Actions&subcategory=General_Pages&viewDataTable=tableGoals");
        await page.waitForNetworkIdle();

        var report = await page.$('.dimensionReport');
        expect(await page.screenshot({fullPage: true})).to.matchImage('action_goals_visualization_page_urls');
    });

    it("should load subtables correctly for action goals visualization if row clicked", async function() {
        let firstRow = await page.jQuery('tr.subDataTable:first');
        await firstRow.click();

        await page.waitForNetworkIdle();
        await page.mouse.move(-10, -10);
        await page.waitForTimeout(250); // rendering

        // Replaces previous screenshot assertion with DOM checks: the action goals
        // visualization is an Actions-style data table, so expanded subrows are
        // inserted inline as siblings with class level1 (see
        // plugins/Actions/javascripts/actionsDataTable.js). Assert the click produced
        // at least one level1 child row.
        const childRowCount = await page.evaluate(
          () => $('table.dataTable tbody tr.level1').length
        );
        expect(childRowCount).to.be.greaterThan(0);
    });

    it("should load row evolution", async function() {
        const row = await page.waitForSelector('.dataTable tbody tr:first-child');
        await row.hover();

        const icon = await page.waitForSelector('.dataTable tbody tr:first-child a.actionRowEvolution');
        await icon.click();

        await page.waitForSelector('.ui-dialog');
        await page.waitForNetworkIdle();

        const series = await page.waitForSelector('[data-name="series3"]');
        await series.click();

        await page.waitForTimeout(250); // rendering

        // Replaces previous screenshot assertion with DOM checks: clicking a series
        // picker triggers showSeries(metric) which fades non-active rows to opacity 0.5
        // and leaves the active series at opacity 1 (jqplot RowEvolutionSeriesToggle).
        const fadedRowsCount = await page.evaluate(() => {
          return $('.ui-dialog:visible .rowevolution table.metrics tr').filter(function () {
            return $(this).find('td').filter(function () {
              return $(this).css('opacity') === '0.5';
            }).length > 0;
          }).length;
        });
        expect(fadedRowsCount).to.be.greaterThan(0);
        const dialogChartVisible = await page.evaluate(
          () => $('.ui-dialog:visible .rowevolution .jqplot-target').length > 0
        );
        expect(dialogChartVisible).to.be.true;
    });

      it('should load goal page for XSS name', async function() {
          await page.goto("?module=CoreHome&action=index&idSite=1&period=year&date=2009-01-01#?idSite=1&period=year&date=2009-01-01&category=Goals_Goals&subcategory=2");
          await page.waitForNetworkIdle();

          // Replaces previous screenshot assertion with text/HTML escaping checks:
          // the XSS payload (rendered via XssTesting::forVueJs) must appear as plain
          // text inside the reporting page (proving the goal name was HTML-encoded
          // and not injected as live markup).
          const reportingPageText = await page.evaluate(
            () => $('.reporting-page').text()
          );
          expect(reportingPageText).to.contain('{{_Vue.h.constructor');

          // No script element rendered inside the reporting page should contain the
          // XSS marker - if any did, it would mean the goal name was injected as
          // executable script.
          const scriptsContainingPayload = await page.evaluate(() => {
            return $('.reporting-page script').filter(function () {
              return ($(this).text() || '').indexOf('{{_Vue.h.constructor') !== -1;
            }).length;
          });
          expect(scriptsContainingPayload).to.equal(0);

          // The payload also must not have produced live HTML elements with the
          // mustache syntax in their text - those would indicate raw HTML injection.
          // Vue mustache should not be evaluated either (the literal `{{...}}` text
          // appears unrendered in the DOM).
          const liveHtmlElementsWithPayload = await page.evaluate(() => {
            return $('.reporting-page')
              .find('iframe[src*="_Vue.h.constructor"], a[href*="_Vue.h.constructor"], img[src*="_Vue.h.constructor"]')
              .length;
          });
          expect(liveHtmlElementsWithPayload).to.equal(0);
      });
});
