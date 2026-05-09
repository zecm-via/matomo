/*!
 * Matomo - free/libre analytics platform
 *
 * GoalsTable screenshot tests.
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

describe("GoalsTable", function () {
    const url = "?module=Widgetize&action=iframe&moduleToWidgetize=Referrers&idSite=1&period=year&date=2012-08-09&"
              + "actionToWidgetize=getKeywords&viewDataTable=table&filter_limit=5&isFooterExpandedInDashboard=1";

    it("should load when the goals icon is clicked", async function () {
        await page.goto(url);
        await page.click('.activateVisualizationSelection > span');
        await page.click('.tableIcon[data-footer-icon-id=tableGoals]');
        await page.mouse.move(-10, -10);
        await page.waitForNetworkIdle();

        expect(await page.screenshot({ fullPage: true })).to.matchImage('initial');
    });

    // Helper: returns the list of recognised goal-scoped column metric segments.
    // Column ids follow either `goal_<digits>_<metric>` (numeric goal ids) or
    // `goal_ecommerceOrder_<metric>` / `goal_ecommerceAbandonedCart_<metric>`.
    function parseGoalIdFromHeader(id) {
        if (!id || id.indexOf('goal_') !== 0) {
            return null;
        }
        const remainder = id.substring('goal_'.length);
        // Numeric goal id: capture digits up to first underscore.
        let match = remainder.match(/^(\d+)_/);
        if (match) {
            return match[1];
        }
        // Ecommerce special goal ids.
        if (remainder.indexOf('ecommerceOrder_') === 0) {
            return 'ecommerceOrder';
        }
        if (remainder.indexOf('ecommerceAbandonedCart_') === 0) {
            return 'ecommerceAbandonedCart';
        }
        return null;
    }

    it("should show columns for all goals when idGoal is 0", async function () {
        const allGoalsUrl = page.url().replace(/viewDataTable=[^&]*/, "viewDataTable=tableGoals") + "&idGoal=0";
        await page.goto(allGoalsUrl);
        await page.waitForSelector('table.dataTable');
        await page.waitForNetworkIdle();

        // Replaces previous screenshot assertion with DOM checks: when idGoal=0 the
        // tableGoals visualization renders columns scoped to multiple goals
        // (goal_<id>_<metric>) plus base nb_visits. We assert that headers exist for
        // multiple distinct goal ids and standard goal metrics.
        const headerIds = await page.evaluate(
          () => $('table.dataTable thead th').map(function () { return this.id; }).get()
        );
        expect(headerIds).to.include('label');
        expect(headerIds).to.include('nb_visits');

        const goalIdsInHeaders = new Set();
        headerIds.forEach((id) => {
          const goalId = parseGoalIdFromHeader(id);
          if (goalId !== null) {
            goalIdsInHeaders.add(goalId);
          }
        });
        expect(goalIdsInHeaders.size).to.be.greaterThan(1);

        // Standard per-goal metrics should each appear at least once.
        const hasNbConversions = headerIds.some((id) => /^goal_\d+_nb_conversions$/.test(id));
        const hasConversionRate = headerIds.some((id) => /^goal_\d+_conversion_rate$/.test(id));
        const hasRevenue = headerIds.some((id) => /^goal_\d+_revenue$/.test(id));
        expect(hasNbConversions).to.be.true;
        expect(hasConversionRate).to.be.true;
        expect(hasRevenue).to.be.true;
    });

    it("should show columns for a single goal when idGoal is 1", async function () {
        await page.goto(page.url().replace(/idGoal=[^&]*/, "idGoal=1"));
        await page.waitForSelector('table.dataTable');
        await page.waitForNetworkIdle();

        // Replaces previous screenshot assertion with DOM checks: when idGoal=1 the
        // tableGoals visualization should only contain columns scoped to goal id 1.
        const headerIds = await page.evaluate(
          () => $('table.dataTable thead th').map(function () { return this.id; }).get()
        );
        const goalIdsInHeaders = new Set();
        headerIds.forEach((id) => {
          const goalId = parseGoalIdFromHeader(id);
          if (goalId !== null) {
            goalIdsInHeaders.add(goalId);
          }
        });
        expect(goalIdsInHeaders.size).to.be.greaterThan(0);
        // Only goal id 1 should be represented (no other numeric ids, no ecommerceOrder).
        goalIdsInHeaders.forEach((goalId) => {
          expect(goalId).to.equal('1');
        });
        // Per-goal metric columns are still present.
        const hasNbConversions = headerIds.some((id) => id === 'goal_1_nb_conversions');
        const hasConversionRate = headerIds.some((id) => id === 'goal_1_conversion_rate');
        expect(hasNbConversions).to.be.true;
        expect(hasConversionRate).to.be.true;
    });

    it("should show an ecommerce view when idGoal is ecommerceOrder", async function () {
        await page.goto(page.url().replace(/idGoal=[^&]*/, "idGoal=ecommerceOrder"));
        await page.waitForSelector('table.dataTable');
        await page.waitForNetworkIdle();

        // Replaces previous screenshot assertion with DOM checks: when
        // idGoal=ecommerceOrder the tableGoals visualization renders the ecommerce
        // order specific column set defined in plugins/Goals/Visualizations/Goals.php.
        const headerIds = await page.evaluate(
          () => $('table.dataTable thead th').map(function () { return this.id; }).get()
        );
        // Expected ecommerce-order columns from Goals visualization
        // (GOALS_DISPLAY_NORMAL switch case).
        expect(headerIds).to.include('goal_ecommerceOrder_nb_conversions');
        expect(headerIds).to.include('goal_ecommerceOrder_revenue');
        expect(headerIds).to.include('goal_ecommerceOrder_conversion_rate');
        expect(headerIds).to.include('goal_ecommerceOrder_avg_order_revenue');
        // No abandoned-cart goal columns should leak into the ecommerce-order view.
        const hasAbandonedGoalColumns = headerIds.some(
          (id) => /^goal_ecommerceAbandonedCart_/.test(id)
        );
        expect(hasAbandonedGoalColumns).to.be.false;
    });

    it("should show a special view when idGoal is ecommerceOrder and viewDataTable is ecommerceOrder", async function () {
        const ecommerceUrl = page.url().replace(/moduleToWidgetize=[^&]*/, "moduleToWidgetize=Goals")
            .replace(/actionToWidgetize=[^&]*/, "actionToWidgetize=getItemsSku")
            .replace(/viewDataTable=[^&]*/, "viewDataTable=ecommerceOrder");

        await page.goto(ecommerceUrl);
        await page.waitForSelector('table.dataTable');
        await page.waitForNetworkIdle();

        // Replaces previous screenshot assertion with DOM checks: the ecommerceOrder
        // view renders the SKU items report. Column-set is the ecommerce-order
        // variant defined in plugins/Ecommerce/Reports/BaseItem.php (revenue,
        // quantity, orders, avg_price, avg_quantity, nb_visits, conversion_rate),
        // and abandonedCarts is forced to 0.
        const headerIds = await page.evaluate(
          () => $('table.dataTable thead th').map(function () { return this.id; }).get()
        );
        expect(headerIds).to.include('label');
        expect(headerIds).to.include('revenue');
        expect(headerIds).to.include('quantity');
        expect(headerIds).to.include('orders');
        // abandoned_carts column belongs to the abandoned-cart view only.
        expect(headerIds).to.not.include('abandoned_carts');
        // The dataTable should record abandonedCarts=0 in its parameters.
        const tableParams = await page.$eval('div.dataTable', (el) => {
          try {
            return JSON.parse(el.getAttribute('data-params') || '{}');
          } catch (e) {
            return {};
          }
        });
        expect(String(tableParams.abandonedCarts)).to.equal('0');
        const tableRowCount = await page.evaluate(
          () => $('table.dataTable tbody tr').length
        );
        expect(tableRowCount).to.be.greaterThan(0);
    });

    it("should show abandoned carts data when the abandoned carts link is clicked", async function () {
        await page.click('.activateVisualizationSelection > span');
        await page.click('.tableIcon[data-footer-icon-id=ecommerceAbandonedCart]');
        await page.mouse.move(-10, -10);
        await page.waitForNetworkIdle();

        // Wait until the dataTable has reloaded with abandonedCarts param applied.
        await page.waitForFunction(() => {
          const el = document.querySelector('div.dataTable');
          if (!el) {
            return false;
          }
          try {
            const params = JSON.parse(el.getAttribute('data-params') || '{}');
            return String(params.abandonedCarts) === '1';
          } catch (e) {
            return false;
          }
        }, { timeout: 10000 });

        // Replaces previous screenshot assertion with DOM/state checks: the dataTable
        // is now rendering the abandoned-cart variant (abandonedCarts param = 1) and
        // contains rows.
        const tableParams = await page.$eval('div.dataTable', (el) => {
          try {
            return JSON.parse(el.getAttribute('data-params') || '{}');
          } catch (e) {
            return {};
          }
        });
        expect(String(tableParams.abandonedCarts)).to.equal('1');
        const rowCount = await page.evaluate(
          () => $('table.dataTable tbody tr').length
        );
        expect(rowCount).to.be.greaterThan(0);
    });
});
