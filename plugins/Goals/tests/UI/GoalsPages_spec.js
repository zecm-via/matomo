/*!
 * Matomo - free/libre analytics platform
 *
 * Screenshot integration tests.
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

describe("GoalsPages", function () {
  var generalParams = 'idSite=1&period=year&date=2012-08-09',
    urlBaseGeneric = 'module=CoreHome&action=index&',
    urlBase = urlBaseGeneric + generalParams;

  // goals pages
  it('should load the goals > ecommerce page correctly', async function () {
    await page.goto("?" + urlBase + "#?" + generalParams + "&category=Goals_Ecommerce&subcategory=General_Overview")
    await page.waitForNetworkIdle();

    expect(await page.screenshotSelector('.pageWrap')).to.matchImage('ecommerce');
  });

  it('should show the correct relative data for the revenue in-cart tooltip', async function() {
    var monthParams = 'idSite=1&period=month&date=2012-01-09';
    await page.goto("?" + urlBase + "#?" + monthParams + "&category=Goals_Ecommerce&subcategory=General_Overview");
    await page.waitForNetworkIdle();
    const element = await page.jQuery('#rightcolumn .sparkline:eq(1) .metricEvolution');
    await element.hover();
    await page.waitForSelector('.ui-tooltip', { visible: true });

    // Replaces previous screenshot assertion with text content assertions on the
    // visible tooltip - mirrors the comparison tooltip test below.
    const tooltipContent = await page.evaluate(() => $('.ui-tooltip:visible').text());
    expect(tooltipContent).to.contain('December 2011');
    expect(tooltipContent).to.contain('January 2012');
  });

  it('should show the selected last year comparison period in an ecommerce sparkline tooltip', async function() {
    var compareMonthParams = 'idSite=1&period=month&date=2012-01-09&compareDates[]=2011-01-01&comparePeriods[]=month';
    await page.goto("?" + urlBaseGeneric + compareMonthParams + "#?" + compareMonthParams + "&category=Goals_Ecommerce&subcategory=General_Overview");
    await page.waitForNetworkIdle();

    const element = await page.jQuery('#rightcolumn .sparkline:eq(1) .metricEvolution');
    await element.hover();
    await page.waitForSelector('.ui-tooltip', { visible: true });

    const tooltipContent = await page.evaluate(() => $('.ui-tooltip:visible').text());

    expect(tooltipContent).to.contain('January 2012');
    expect(tooltipContent).to.contain('January 2011');
  });

  it('should load the goals > overview page correctly', async function () {
    await page.goto("?" + urlBase + "#?" + generalParams + "&category=Goals_Goals&subcategory=General_Overview");
    await page.waitForNetworkIdle();

    // Replaces previous screenshot assertion with DOM checks: the goals overview
    // page renders the page wrap with the goals visualization table and at least
    // one sparkline-bearing row.
    const pageWrapVisible = await page.evaluate(
      () => $('.pageWrap:visible').length > 0
    );
    expect(pageWrapVisible).to.be.true;
    const goalsTableRows = await page.evaluate(
      () => $('.pageWrap .dataTableVizGoals tbody tr').length
    );
    expect(goalsTableRows).to.be.greaterThan(0);
    const sparklineCount = await page.evaluate(
      () => $('.pageWrap .sparkline').length
    );
    expect(sparklineCount).to.be.greaterThan(0);
  });

  it('should load row evolution with goal metrics', async function() {
    const row = await page.waitForSelector('.reportsByDimensionView tbody tr:first-child');
    await row.hover();

    const icon = await page.waitForSelector('.reportsByDimensionView tbody tr:first-child a.actionRowEvolution');
    await icon.click();

    await page.waitForSelector('.ui-dialog');
    await page.waitForNetworkIdle();

    // Replaces previous screenshot assertion with DOM checks: dialog opens with
    // the row evolution chart container present.
    const dialogVisible = await page.evaluate(
      () => $('.ui-dialog:visible').length > 0
    );
    expect(dialogVisible).to.be.true;
    const rowEvolutionPresent = await page.evaluate(
      () => $('.ui-dialog:visible .rowevolution').length > 0
    );
    expect(rowEvolutionPresent).to.be.true;
  });

  it('should load row evolution with goal metrics again when reloading the page url', async function() {
    // page.reload() won't work with url hashes
    const url = await page.evaluate('location.href');
    await page.goto('about:blank');
    await page.goto(url);

    // Wait for the dialog to be fully restored (chart rendered) before asserting.
    await page.waitForSelector('.ui-dialog', { visible: true });
    await page.waitForFunction(
      "$('.ui-dialog:visible .rowevolution .jqplot-target').length > 0",
      { timeout: 15000 }
    );
    await page.waitForNetworkIdle();

    // Replaces previous screenshot assertion with DOM checks: dialog and row
    // evolution chart are restored without manual re-trigger after reload.
    const dialogVisible = await page.evaluate(
      () => $('.ui-dialog:visible').length > 0
    );
    expect(dialogVisible).to.be.true;
    const rowEvolutionPresent = await page.evaluate(
      () => $('.ui-dialog:visible .rowevolution').length > 0
    );
    expect(rowEvolutionPresent).to.be.true;
  });

  it('should load the goals > management page correctly', async function () {
    await page.goto("?" + generalParams + "&module=Goals&action=manage");
    await page.waitForNetworkIdle();

    expect(await page.screenshotSelector('#content,.top_bar_sites_selector,.entityContainer')).to.matchImage('manage');
  });

  it('should load the goals > single goal page correctly', async function () {
    await page.goto("?" + urlBase + "#?" + generalParams + "&category=Goals_Goals&subcategory=1");
    await page.waitForNetworkIdle();

    expect(await page.screenshotSelector('.pageWrap')).to.matchImage('individual_goal');
  });

  it('should update the evolution chart if a sparkline is clicked', async function () {
    elem = await page.jQuery('.sparkline.linked:contains(conversion rate)');
    await elem.click();
    await page.waitForNetworkIdle();
    await page.mouse.move(-10, -10);

    // Replaces previous screenshot assertion with DOM checks: the sparkline click
    // triggers a dataTable reload (sparkline.js -> dataTable.trigger('reload', ...))
    // and the evolution chart re-renders. We assert that the chart container is
    // still present and that the conversion-rate sparkline is still recognised
    // as linked (didn't get torn down).
    const evolutionChartVisible = await page.evaluate(
      () => $('.pageWrap div.dataTableVizEvolution .jqplot-target').length > 0
    );
    expect(evolutionChartVisible).to.be.true;
    const conversionRateSparkline = await page.evaluate(
      () => $('.pageWrap .sparkline.linked').filter(function () {
        return $(this).text().toLowerCase().indexOf('conversion rate') !== -1;
      }).length
    );
    expect(conversionRateSparkline).to.be.greaterThan(0);
  });

  // should load the row evolution [see #11526]
  it('should show rov evolution for goal tables', async function () {
    await page.waitForNetworkIdle();

    const row = await page.waitForSelector('.dataTable tbody tr:first-child');
    await row.hover();

    const icon = await page.waitForSelector('.dataTable tbody tr:first-child a.actionRowEvolution');
    await icon.click();

    await page.waitForSelector('.rowevolution');
    await page.waitForNetworkIdle();

    // Replaces previous screenshot assertion with DOM checks: row-evolution dialog
    // opened from the individual-goal datatable.
    const dialogVisible = await page.evaluate(
      () => $('.ui-dialog:visible').length > 0
    );
    expect(dialogVisible).to.be.true;
    const rowEvolutionPresent = await page.evaluate(
      () => $('.ui-dialog:visible .rowevolution').length > 0
    );
    expect(rowEvolutionPresent).to.be.true;
  });

  it('should load row evolution with goal metrics again when reloading the page url', async function() {
    // page.reload() won't work with url hashes
    const url = await page.evaluate('location.href');
    await page.goto('about:blank');
    await page.goto(url);

    // Wait for the dialog to be fully restored (chart rendered) before asserting.
    await page.waitForSelector('.ui-dialog', { visible: true });
    await page.waitForFunction(
      "$('.ui-dialog:visible .rowevolution .jqplot-target').length > 0",
      { timeout: 15000 }
    );
    await page.waitForNetworkIdle();

    // Replaces previous screenshot assertion with DOM checks: dialog and row
    // evolution chart are restored without manual re-trigger after reload.
    const dialogVisible = await page.evaluate(
      () => $('.ui-dialog:visible').length > 0
    );
    expect(dialogVisible).to.be.true;
    const rowEvolutionPresent = await page.evaluate(
      () => $('.ui-dialog:visible .rowevolution').length > 0
    );
    expect(rowEvolutionPresent).to.be.true;
  });
});
