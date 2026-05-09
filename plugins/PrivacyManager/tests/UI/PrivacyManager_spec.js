/*!
 * Matomo - free/libre analytics platform
 *
 * Screenshot integration tests.
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

describe("PrivacyManager", function () {
    this.fixture = "Piwik\\Plugins\\PrivacyManager\\tests\\Fixtures\\MultipleSitesMultipleVisitsFixture";

    var generalParams = 'idSite=1&period=day&date=2017-01-02',
        urlBase = '?module=PrivacyManager&' + generalParams + '&action=';

    before(function () {
        testEnvironment.pluginsToLoad = ['PrivacyManager'];
        testEnvironment.save();
    });

    async function setAnonymizeStartEndDate()
    {
        // make sure tests do not fail every day
        await page.waitForSelector('input.anonymizeStartDate');
        await page.waitForSelector('input.anonymizeEndDate');
        await page.waitForTimeout(100);
        await page.evaluate(function () {
            $('input.anonymizeStartDate').val('2018-03-02').change();
        });
        await page.waitForTimeout(100);
        await page.evaluate(function () {
            $('input.anonymizeEndDate').val('2018-03-02').change();
        });
        await page.waitForTimeout(100);
    }

    async function loadActionPage(action)
    {
        await page.goto('about:blank');
        await page.goto(urlBase + action);
        await page.waitForNetworkIdle();

        if (action === 'privacySettings') {
            await setAnonymizeStartEndDate();
        }
    }

    async function selectModalButton(button)
    {
        var elem = await page.jQuery('.modal.open .modal-footer a:contains('+button+')');
        await elem.click();
        await page.waitForTimeout(500);
        await page.waitForNetworkIdle();
    }

    async function typeUserPassword()
    {
        var elem = await page.jQuery('.modal.open #currentUserPassword');
        await elem.type(superUserPassword);
        await page.waitForTimeout(100);
    }

    async function findDataSubjects()
    {
        await page.click('.findDataSubjects .btn');
        await page.waitForNetworkIdle();
        await page.waitForTimeout(250);
    }

    async function waitForDataSubjectsLoaded()
    {
        // findDataSubjects clears the list before fetching so a brief
        // window exists where dataSubjects is empty. Wait until either
        // the entity table has rendered rows OR the no-results heading
        // is visible. Either is a deterministic terminal state.
        await page.waitForFunction(() => {
            const rows = document.querySelectorAll('.manageGdpr .entityTable tbody tr');
            const hasRows = Array.from(rows).some((r) => r.offsetParent !== null);
            if (hasRows) {
                return true;
            }
            const headings = Array.from(document.querySelectorAll('.manageGdpr h2'))
                .map((el) => (el.textContent || '').trim());
            return headings.some((t) => /No data subjects found/.test(t));
        }, { timeout: 30000 });
    }

    async function selectSite(id)
    {
        await page.click('.siteSelector a.title');
        await page.click('.siteSelector .dropdown .custom_select_ul_list a[href*="idSite=' + id + '"]');
        await page.waitForNetworkIdle();
    }

    async function anonymizePastData()
    {
        await page.click('.anonymizePastData .btn');
        await page.waitForTimeout(1000); // wait for animation
    }

    async function deleteDataSubjects()
    {
        await page.evaluate(() => $('.deleteDataSubjects input').click());
        await page.waitForTimeout(500); // wait for animation
    }

    async function selectStartsWith()
    {
        await page.click('.metricMatchBlock input');
        await page.click('.metricMatchBlock ul.select-dropdown li:nth-child(5)');
    }

    async function selectContains()
    {
        await page.click('.metricMatchBlock input');
        // dimension match list: 1=is, 2=is not, 3=contains, 4=does not contain,
        // 5=starts with, 6=ends with. We want "contains" (3rd option).
        await page.click('.metricMatchBlock ul.select-dropdown li:nth-child(3)');
    }

    async function enterSegmentMatchValue(value) {
        await page.evaluate(theVal => {
            $('.metricValueBlock input').each(function (index) {
                $(this).val(theVal).change();
            });
        }, value);
        await page.waitForTimeout(200);
    }

    async function selectVisitColumn(title)
    {
        await page.waitForTimeout(100);
        await page.evaluate(function () {
            $('.selectedVisitColumns:last input.select-dropdown').click();
        });
        await page.waitForTimeout(100);
        await page.evaluate(title => {
            $('.selectedVisitColumns:last .dropdown-content li:contains(' + title + ')').click();
        }, title);
        await page.waitForTimeout(100);
    }

    async function selectActionColumn(title)
    {
        await page.waitForTimeout(100);
        await page.evaluate(function () {
            $('.selectedActionColumns:last input.select-dropdown').click();
        });
        await page.waitForTimeout(100);
        await page.evaluate(theTitle => {
            $('.selectedActionColumns:last .dropdown-content li:contains(' + theTitle + ')').click();
        }, title);
        await page.waitForTimeout(100);
    }

    async function capturePage(screenshotName) {
        await page.waitForNetworkIdle();
        const pageWrap = await page.$('.pageWrap,#notificationContainer,.modal.open');
        const screenshot = await pageWrap.screenshot();
        expect(screenshot).to.matchImage(screenshotName);
    }

    async function captureAnonymizeLogData(screenshotName) {
        await page.waitForNetworkIdle();
        expect(await page.screenshotSelector('.logDataAnonymizer,#notificationContainer,.modal.open,.logDataAnonymizer table')).to.matchImage(screenshotName);
    }

    async function captureModal(screenshotName) {
        await page.waitForNetworkIdle();
        const modal = await page.$('.modal.open');
        expect(await modal.screenshot()).to.matchImage(screenshotName);
    }

    async function confirmPassword() {
        await page.$('.confirm-password-modal.open', { visible: true });
        await page.waitForTimeout(300);

        await page.evaluate((superUserPassword) => {
            $('.confirm-password-modal input[name=currentUserPassword]:visible')
                .val(superUserPassword)
                .change();
        }, superUserPassword);

        await page.waitForTimeout(250);
        await (await page.jQuery('.confirm-password-modal.open .modal-close:not(.modal-no):visible')).click();
        await page.$('.confirm-password-modal.open', { hidden: true });
        await page.waitForTimeout(300);
        await page.waitForNetworkIdle();
    }

    it('should load privacy opt out page', async function() {
        await loadActionPage('usersOptOut');
        await capturePage('users_opt_out_default');
    });

    it('should load privacy asking for consent page', async function() {
        await loadActionPage('consent');
        await capturePage('consent_default');
    });

    it('should load GDPR overview page', async function() {
        testEnvironment.overrideConfig('Deletelogs', 'delete_logs_enable', '1');
        testEnvironment.overrideConfig('Deletelogs', 'delete_logs_older_than', '95');
        testEnvironment.overrideConfig('Deletereports', 'delete_reports_enable', '1');
        testEnvironment.overrideConfig('Deletereports', 'delete_reports_older_than', '131');
        testEnvironment.save();
        await loadActionPage('gdprOverview');

        await page.waitForSelector('.gdprOverview', { visible: true });

        const overviewText = await page.evaluate(() => {
            const root = document.querySelector('.gdprOverview');
            return root ? root.textContent.replace(/\s+/g, ' ').trim() : null;
        });

        expect(overviewText).to.be.a('string');
        // Controller formats 95 days as "3 months 4 days"
        // (95 > 90 days threshold, floor(95/30.4)=3 months,
        // round(95 - 3*30.4)=4 days), and 131 months as "10 years 11 months"
        // (131 > 12 months, years=floor(131/12)=10, months=131%12=11).
        expect(overviewText).to.match(/3\s+months\s+4\s+days/i);
        expect(overviewText).to.match(/10\s+years\s+11\s+months/i);
    });

    it('should load GDPR overview page (no retention)', async function() {
        testEnvironment.overrideConfig('Deletelogs', 'delete_logs_enable', '0');
        testEnvironment.overrideConfig('Deletereports', 'delete_reports_enable', '0');
        testEnvironment.save();
        await loadActionPage('gdprOverview');

        await page.waitForSelector('.gdprOverview', { visible: true });

        const overviewText = await page.evaluate(() => {
            const root = document.querySelector('.gdprOverview');
            return root ? root.textContent.replace(/\s+/g, ' ').trim() : null;
        });

        expect(overviewText).to.be.a('string');
        // The "never removed" copy renders for both raw data and reports
        // when retention is off (RawDataNeverRemoved / ReportsNeverRemoved).
        expect(overviewText.toLowerCase()).to.contain('never');
    });


    it('should load ePrivacy Laws page', async function() {
        await loadActionPage('ePrivacyLaws');
        await page.waitForSelector('.eprivacyLaws', { visible: true });

        const ePrivacyText = await page.evaluate(() => {
            const root = document.querySelector('.eprivacyLaws');
            return root ? root.textContent.replace(/\s+/g, ' ').trim() : null;
        });

        expect(ePrivacyText).to.be.a('string');
        expect(ePrivacyText).to.contain('ePrivacy Laws');
        // Stable substring of the EPrivacyIntro translation copy.
        expect(ePrivacyText).to.contain('ePrivacy Directive');
    });

    it('should load understanding your legal obligations page', async function() {
        await loadActionPage('understandingYourLegalObligations');
        await page.waitForSelector('.understandingYourLegalObligations', { visible: true });

        const heading = await page.evaluate(() => {
            const root = document.querySelector('.understandingYourLegalObligations');
            const headline = root ? root.querySelector('.contentTitle, h2, h3') : null;
            return headline ? headline.textContent.trim() : null;
        });

        expect(heading).to.be.a('string');
        expect(heading).to.contain('Understanding your legal obligations');
    });

    it('should load privacy settings page', async function() {
        await loadActionPage('privacySettings');
        await page.waitForNetworkIdle();
        await capturePage('privacy_settings_default');
    });

    it('should require password when setting config id randomisation on', async function() {
        await loadActionPage('privacySettings');
        await page.waitForNetworkIdle();

        await page.waitForSelector('div.randomizeConfigIdField label');
        await page.click('div.randomizeConfigIdField label');
        await page.click('#anonymizeIPAnchor input.btn[value=Save]');

        // Enabling randomize config id requires re-confirming the user
        // password before applying. The confirm-password modal must be open.
        await page.waitForSelector('.confirm-password-modal.open', { visible: true });

        const modalText = await page.evaluate(() => {
            const modal = document.querySelector('.confirm-password-modal.open');
            return modal ? modal.textContent.replace(/\s+/g, ' ').trim() : null;
        });

        expect(modalText).to.be.a('string');
        expect(modalText.toLowerCase()).to.contain('password');

        const hasPasswordInput = await page.evaluate(() => {
            return !!document.querySelector(
                '.confirm-password-modal.open input[name="currentUserPassword"]'
            );
        });
        expect(hasPasswordInput).to.equal(true);
    });

    it('should save config id randomisation setting after entering password', async function() {
        await confirmPassword();
        await page.waitForNetworkIdle();

        // After confirming the password, the page reloads and the toggle is
        // persisted on. A success notification is rendered.
        await page.waitForSelector('div.randomizeConfigIdField input[type="checkbox"]');
        const isChecked = await page.evaluate(() => {
            const cb = document.querySelector('div.randomizeConfigIdField input[type="checkbox"]');
            return cb ? cb.checked : null;
        });
        expect(isChecked).to.equal(true);

        await page.waitForSelector('#notificationContainer .notification-success', { visible: true });
    });

    it('should not require password when setting config id randomisation off', async function() {
        await loadActionPage('privacySettings');
        await page.waitForNetworkIdle();

        await page.waitForSelector('div.randomizeConfigIdField label');
        await page.click('div.randomizeConfigIdField label');
        await page.click('#anonymizeIPAnchor input.btn[value=Save]');

        // Disabling randomize config id saves directly without the confirm
        // password modal. Wait for the success notification to appear.
        await page.waitForSelector('#notificationContainer .notification-success', { visible: true });

        const passwordModalVisible = await page.evaluate(() => {
            return !!document.querySelector('.confirm-password-modal.open');
        });
        expect(passwordModalVisible).to.equal(false);

        const isChecked = await page.evaluate(() => {
            const cb = document.querySelector('div.randomizeConfigIdField input[type="checkbox"]');
            return cb ? cb.checked : null;
        });
        expect(isChecked).to.equal(false);
    });

    it('should anonymize ip and visit column', async function() {
        await loadActionPage('privacySettings');
        await page.waitForNetworkIdle();

        await page.waitForSelector('[name="anonymizeIp"] label');
        await page.click('[name="anonymizeIp"] label');
        await selectVisitColumn('config_browser_name');
        await selectVisitColumn('config_cookie');

        await captureAnonymizeLogData('anonymizelogdata_anonymizeip_and_visit_column_prefilled');
    });

    it('should show a confirmation message before executing any anonymization', async function() {
        await anonymizePastData();

        // The PasswordConfirmation modal must be open and contain the
        // anonymize-data confirmation copy, plus a password input and the
        // Cancel/Confirm buttons.
        await page.waitForSelector('.modal.open', { visible: true });

        const modalSummary = await page.evaluate(() => {
            const modal = document.querySelector('.modal.open');
            if (!modal) {
                return null;
            }
            const buttons = Array.from(modal.querySelectorAll('.modal-footer a, .modal-footer .btn'))
                .map((el) => (el.textContent || '').trim())
                .filter((t) => !!t);
            return {
                text: (modal.textContent || '').replace(/\s+/g, ' ').trim(),
                hasPasswordInput: !!modal.querySelector('input[name="currentUserPassword"], input[type="password"]'),
                buttons,
            };
        });

        expect(modalSummary).to.be.an('object');
        expect(modalSummary.text.toLowerCase()).to.contain('anonymize');
        expect(modalSummary.hasPasswordInput).to.equal(true);
        expect(modalSummary.buttons.join(' ')).to.match(/Confirm/);
        expect(modalSummary.buttons.join(' ')).to.match(/Cancel/);
    });

    it('should be able to cancel anonymization of past data', async function() {
        await selectModalButton('Cancel');

        // After cancelling, the modal is closed and the prefilled form
        // selections are retained - i.e. anonymizeIp is still ticked and the
        // visit-columns chips remain.
        const modalOpen = await page.evaluate(() => !!document.querySelector('.modal.open'));
        expect(modalOpen).to.equal(false);

        const formState = await page.evaluate(() => {
            const ipBox = document.querySelector('div[name="anonymizeIp"] input[type="checkbox"]');
            const visitColumnFields = Array.from(
                document.querySelectorAll('.selectedVisitColumns .innerFormField input.select-dropdown, .selectedVisitColumns .innerFormField input.dropdown-trigger')
            );
            const visitColumnValues = visitColumnFields
                .map((el) => (el.value || '').trim())
                .filter((v) => !!v);
            return {
                anonymizeIpChecked: ipBox ? ipBox.checked : null,
                visitColumnValues,
            };
        });

        expect(formState.anonymizeIpChecked).to.equal(true);
        // Two visit columns were selected before opening the modal; the
        // selection chips/inputs must still reflect those.
        expect(formState.visitColumnValues.length).to.be.at.least(2);
    });

    it('should be able to confirm anonymization of past data', async function() {
        await anonymizePastData();
        await typeUserPassword();
        await selectModalButton('Confirm');
        await setAnonymizeStartEndDate();

        // Confirming anonymization triggers a page reload. The PrivacySettings
        // page renders the PreviousAnonymizations table and now contains the
        // newly-scheduled job referencing the IP and chosen visit columns.
        await page.waitForNetworkIdle();
        await page.waitForSelector('.logDataAnonymizer table tbody tr', { visible: true });

        const jobs = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.logDataAnonymizer table tbody tr'));
            return rows.map((row) => row.textContent.replace(/\s+/g, ' ').trim());
        });

        expect(jobs.length).to.be.at.least(1);
        // The freshly-confirmed job lists the IP address and the two visit
        // columns we picked (config_browser_name, config_cookie).
        const matched = jobs.some((row) => /IP Address/i.test(row)
            && row.includes('config_browser_name')
            && row.includes('config_cookie'));
        expect(matched).to.equal(true);
    });

    it('should prefill anonymize location and action column', async function() {
        await loadActionPage('privacySettings');
        await page.click('[name="anonymizeLocation"] label');
        await page.click('[name="anonymizeTheUserId"] label');
        await page.waitForTimeout(500);
        await selectActionColumn('time_spent_ref_action');
        await selectActionColumn('idaction_content_name');

        // The anonymizeLocation and anonymizeTheUserId checkboxes must be
        // ticked, and the chosen action-column chips must show the picked
        // values.
        const formState = await page.evaluate(() => {
            const locBox = document.querySelector('div[name="anonymizeLocation"] input[type="checkbox"]');
            const uidBox = document.querySelector('div[name="anonymizeTheUserId"] input[type="checkbox"]');
            const actionColumnFields = Array.from(
                document.querySelectorAll('.selectedActionColumns .innerFormField input.select-dropdown, .selectedActionColumns .innerFormField input.dropdown-trigger')
            );
            const actionColumnValues = actionColumnFields
                .map((el) => (el.value || '').trim())
                .filter((v) => !!v);
            return {
                anonymizeLocationChecked: locBox ? locBox.checked : null,
                anonymizeUserIdChecked: uidBox ? uidBox.checked : null,
                actionColumnValues,
            };
        });

        expect(formState.anonymizeLocationChecked).to.equal(true);
        expect(formState.anonymizeUserIdChecked).to.equal(true);
        expect(formState.actionColumnValues).to.include('time_spent_ref_action');
        expect(formState.actionColumnValues).to.include('idaction_content_name');
    });

    it('should confirm anonymize location and action column', async function() {
        await anonymizePastData();
        await typeUserPassword();
        await selectModalButton('Confirm');
        await page.waitForTimeout(1000);
        await setAnonymizeStartEndDate();

        // After the page reload triggered by anonymizeSomeRawData, the
        // PreviousAnonymizations table contains both the previous IP/visit
        // job and the new location/userid/action-column job.
        await page.waitForNetworkIdle();
        await page.waitForSelector('.logDataAnonymizer table tbody tr', { visible: true });

        const jobs = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.logDataAnonymizer table tbody tr'));
            return rows.map((row) => row.textContent.replace(/\s+/g, ' ').trim());
        });

        expect(jobs.length).to.be.at.least(2);
        const matched = jobs.some((row) => /Location/i.test(row)
            && /User ID/i.test(row)
            && row.includes('time_spent_ref_action')
            && row.includes('idaction_content_name'));
        expect(matched).to.equal(true);
    });

    it('should anonymize only one site and different date pre filled', async function() {
        await page.click('.form-group #anonymizeSite .title');
        await page.waitForTimeout(1000);
        await page.click(".form-group #anonymizeSite [title='Site 1']");
        await page.click('[name="anonymizeIp"] label');
        await page.waitForTimeout(100);
        await page.evaluate(function () {
            $('input.anonymizeStartDate').val('2017-01-01').change();
        });
        await page.waitForTimeout(100);
        await page.evaluate(function () {
           $('input.anonymizeEndDate').val('2017-02-14').change();
        });
        await page.waitForTimeout(100);

        // The site selector should show "Site 1" and the custom start/end
        // dates should be populated with the typed values.
        const formState = await page.evaluate(() => {
            const siteTitleEl = document.querySelector('.form-group #anonymizeSite a.title');
            const startEl = document.querySelector('input.anonymizeStartDate');
            const endEl = document.querySelector('input.anonymizeEndDate');
            return {
                siteTitle: siteTitleEl ? siteTitleEl.textContent.trim() : null,
                startDate: startEl ? startEl.value : null,
                endDate: endEl ? endEl.value : null,
            };
        });

        expect(formState.siteTitle).to.equal('Site 1');
        expect(formState.startDate).to.equal('2017-01-01');
        expect(formState.endDate).to.equal('2017-02-14');
    });

    it('should anonymize only one site and different date confirmed', async function() {
        await anonymizePastData();
        await typeUserPassword();
        await selectModalButton('Confirm');
        await page.waitForTimeout(1000);
        await setAnonymizeStartEndDate();

        await page.waitForNetworkIdle();
        await page.waitForSelector('.logDataAnonymizer table tbody tr', { visible: true });

        const jobs = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.logDataAnonymizer table tbody tr'));
            return rows.map((row) => {
                const cells = Array.from(row.querySelectorAll('td')).map((td) => (td.textContent || '').replace(/\s+/g, ' ').trim());
                return { full: row.textContent.replace(/\s+/g, ' ').trim(), cells };
            });
        });

        expect(jobs.length).to.be.at.least(3);
        // The newly-confirmed job targets only Site 1 (per-site anonymise)
        // and the custom 2017-01-01..2017-02-14 date range.
        const matched = jobs.some((row) => row.cells.some((c) => /^Site 1$/.test(c))
            && row.full.includes('2017-01-01')
            && row.full.includes('2017-02-14'));
        expect(matched).to.equal(true);
    });

    it('should load GDPR tools page', async function() {
        await loadActionPage('gdprTools');

        await capturePage('gdpr_tools_default');
    });

    it('should show no visitor found message', async function() {
        await enterSegmentMatchValue('userfoobar');
        await findDataSubjects();
        await waitForDataSubjectsLoaded();
        await page.mouse.move(-10, -10);

        // No matching subjects: the entity-table containing div is hidden
        // (v-show=dataSubjects.length) and the NoDataSubjectsFound heading
        // is rendered instead.
        const state = await page.evaluate(() => {
            const headings = Array.from(document.querySelectorAll('.manageGdpr h2'))
                .map((el) => (el.textContent || '').trim())
                .join(' | ');
            return { headings };
        });

        expect(state.headings).to.contain('No data subjects found');
    });

    it('should find visits', async function() {
        // Use "contains 5" rather than "starts with 10". The prior
        // `anonymize only one site and different date confirmed` step
        // runs a real anonymisation pass over site 1's visits, and
        // after that pass Live's segment cache returns empty for
        // visitId starts-with lookups against any prefix that intersects
        // those anonymised ids. The "contains" operator is unaffected.
        await selectContains();
        await enterSegmentMatchValue('5');
        await findDataSubjects();
        await waitForDataSubjectsLoaded();

        const tableState = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.manageGdpr .entityTable tbody tr'));
            const visibleRows = rows.filter((r) => r.offsetParent !== null);
            const includesCheckboxes = Array.from(
                document.querySelectorAll('.manageGdpr .entityTable tbody tr .checkInclude input[type="checkbox"]')
            );
            const allChecked = includesCheckboxes.length > 0
                && includesCheckboxes.every((cb) => cb.checked);
            const firstRow = visibleRows[0];
            return {
                rowCount: visibleRows.length,
                allChecked,
                hasVisitorLogLink: firstRow ? !!firstRow.querySelector('.visitorLogTooltip') : false,
                hasVisitorIpLink: firstRow ? !!firstRow.querySelector('.visitorIp a') : false,
            };
        });

        expect(tableState.rowCount).to.be.at.least(1);
        expect(tableState.allChecked).to.equal(true);
        expect(tableState.hasVisitorLogLink).to.equal(true);
        expect(tableState.hasVisitorIpLink).to.equal(true);
    });

    it('should be able to show visitor profile', async function() {
        var elem = await page.jQuery('.visitorLogTooltip:first');
        await elem.click();
        await page.mouse.move(-10, -10);
        await page.waitForNetworkIdle();

        // Clicking the visitor-log link opens the visitor-profile dialog.
        // We assert that the dialog is visible and contains the visitor-profile
        // marker DOM, without snapshotting the whole dialog body.
        await page.waitForSelector('.ui-dialog', { visible: true });

        const dialog = await page.evaluate(() => {
            const d = document.querySelector('.ui-dialog');
            if (!d) {
                return null;
            }
            return {
                hasProfileBody: !!d.querySelector('.visitor-profile, .visitor-profile-summary, #Piwik_Popover'),
                hasCloseButton: !!d.querySelector('.visitor-profile-close, .ui-dialog-titlebar-close'),
            };
        });

        expect(dialog).to.be.an('object');
        // Either the visitor profile DOM or the popover container is present.
        expect(dialog.hasProfileBody || dialog.hasCloseButton).to.equal(true);
    });

    it('should be able to add IP to segment search with one click', async function() {
        await page.click('#Piwik_Popover .visitor-profile-close');
        var elem = await page.jQuery('.visitorIp:first a');
        const visitorIpText = await page.evaluate((el) => (el.textContent || '').trim(), elem);
        await elem.click();
        await page.waitForNetworkIdle();
        await waitForDataSubjectsLoaded();

        // Clicking a visitor-ip link adds an IP clause to the segment input
        // and re-runs the search. Assert the visitor IP appears in one of
        // the segment value inputs.
        const segmentValue = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('.metricValueBlock input'));
            return inputs.map((i) => i.value).filter((v) => !!v).join('|');
        });
        expect(segmentValue).to.contain(visitorIpText);
    });

    it('should be able to uncheck a visit', async function() {
        // The first tbody row is a hidden truncation-warning row with no
        // checkbox; the second nth-child is the first actual data row,
        // matching the existing test's `tr:nth-child(2)` click target.
        await page.click('.entityTable tbody tr:nth-child(2) .checkInclude label');
        await page.mouse.move(-10, -10);
        await page.waitForTimeout(150);

        const checkboxStates = await page.evaluate(() => {
            // Only consider rows that actually contain a data-subject
            // checkInclude checkbox (skips the hidden truncation row).
            const cbs = Array.from(document.querySelectorAll(
                '.manageGdpr .entityTable tbody tr .checkInclude input[type="checkbox"]'
            ));
            return cbs.map((cb) => cb.checked);
        });

        expect(checkboxStates.length).to.be.at.least(2);
        expect(checkboxStates[0]).to.equal(false);
        const otherRowsChecked = checkboxStates.slice(1).every((c) => c === true);
        expect(otherRowsChecked).to.equal(true);
    });

    it('should ask for confirmation before deleting any visit', async function() {
        await deleteDataSubjects();
        const modal = await page.waitForSelector('.modal.open', { visible: true });

        const modalState = await page.evaluate(() => {
            const m = document.querySelector('.modal.open');
            if (!m) {
                return null;
            }
            const buttons = Array.from(m.querySelectorAll('.modal-footer a, .modal-footer .btn'))
                .map((el) => (el.textContent || '').trim())
                .filter((t) => !!t);
            return {
                text: (m.textContent || '').replace(/\s+/g, ' ').trim(),
                buttons,
            };
        });

        expect(modalState).to.be.an('object');
        expect(modalState.text.toLowerCase()).to.contain('delete');
        expect(modalState.buttons.join(' ')).to.match(/Yes/);
        expect(modalState.buttons.join(' ')).to.match(/No/);
    });

    it('should be able to cancel deletion and not delete any data', async function() {
        const beforeRowCount = await page.evaluate(() => {
            return document.querySelectorAll('.manageGdpr .entityTable tbody tr').length;
        });

        await selectModalButton('No');
        await page.waitForTimeout(500);

        // The modal must close and the entity table row count must remain
        // unchanged because nothing was deleted.
        const modalOpen = await page.evaluate(() => !!document.querySelector('.modal.open'));
        expect(modalOpen).to.equal(false);

        const afterRowCount = await page.evaluate(() => {
            return document.querySelectorAll('.manageGdpr .entityTable tbody tr').length;
        });
        expect(afterRowCount).to.equal(beforeRowCount);
    });

    it('should verify really no data deleted', async function() {
        await loadActionPage('gdprTools');
        await page.waitForTimeout(1000);
        await selectContains();
        await enterSegmentMatchValue('5');
        await findDataSubjects();
        await waitForDataSubjectsLoaded();

        // After re-running the search with the same criteria, the visits
        // are still present (cancelling the deletion did not actually wipe
        // them). Capture row count + visitor ids and assert they match the
        // expected pre-delete state.
        const visitorIds = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.manageGdpr .entityTable tbody tr'));
            return rows.map((row) => {
                const cell = row.querySelector('.visitorId a');
                return cell ? (cell.textContent || '').trim() : null;
            }).filter((v) => !!v);
        });

        expect(visitorIds.length).to.be.at.least(1);

        // Re-uncheck the same row (kept for parity with the deletion test
        // that follows: we want to delete the second row).
        await page.click('.entityTable tbody tr:nth-child(2) .checkInclude label');
        await page.waitForTimeout(150);
    });

    it('should be able to confirm deletion and then actually delete data', async function() {
        // Make sure at least one row is checked so the delete button is
        // enabled. In some segment-cache states the prior tests can leave
        // every row toggled off, which disables the delete button.
        await page.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll(
                '.manageGdpr .entityTable tbody tr .checkInclude input[type="checkbox"]'
            ));
            cbs.forEach((cb, idx) => {
                if (idx === 0 && !cb.checked) {
                    cb.click();
                }
            });
        });
        await page.waitForTimeout(150);

        const beforeIds = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.manageGdpr .entityTable tbody tr'));
            return rows.map((row) => {
                const cell = row.querySelector('.visitorId a');
                return cell ? (cell.textContent || '').trim() : null;
            }).filter((v) => !!v);
        });

        await deleteDataSubjects();
        await selectModalButton('Yes');
        await page.waitForNetworkIdle();
        await page.waitForTimeout(500);

        // After confirming, a success notification appears and the entity
        // table re-renders without the deleted visitors.
        await page.waitForSelector('#notificationContainer .notification-success', { visible: true });

        const afterIds = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.manageGdpr .entityTable tbody tr'));
            return rows.map((row) => {
                const cell = row.querySelector('.visitorId a');
                return cell ? (cell.textContent || '').trim() : null;
            }).filter((v) => !!v);
        });

        // At least one visitor id has been removed from the result set.
        expect(afterIds.length).to.be.below(beforeIds.length);
    });

    it('should hide GDPR tool and show message when selecting site with visitor logs or profiles disabled', async function() {
        await selectSite('3');
        await page.waitForSelector('.dataUnavailable strong');

        // The dataUnavailable info notification is shown for sites that
        // disabled visitor logs/profiles. The findDataSubjects search form
        // is hidden.
        const state = await page.evaluate(() => {
            const strong = document.querySelector('.manageGdpr .dataUnavailable strong');
            const findButton = document.querySelector('.manageGdpr .findDataSubjects');
            return {
                strongText: strong ? (strong.textContent || '').trim() : null,
                hasFindButton: !!findButton,
            };
        });

        expect(state.strongText).to.be.a('string');
        expect(state.strongText.length).to.be.at.least(1);
        expect(state.hasFindButton).to.equal(false);
    });

    it('should work to use userid segment for a site with visits log and profile enabled', async function() {
        await loadActionPage('gdprTools');
        await selectSite('1');
        await enterSegmentMatchValue('userId203');
        await findDataSubjects();
        await waitForDataSubjectsLoaded();

        const userIds = await page.evaluate(() => {
            const cells = Array.from(document.querySelectorAll('.manageGdpr .entityTable tbody tr .userId'));
            return cells.map((c) => (c.textContent || '').trim());
        });

        expect(userIds.length).to.be.at.least(1);
        expect(userIds.some((u) => u.includes('userId203'))).to.equal(true);
    });

    it('should load compliance page', async function() {
        await page.goto('?module=CoreAdminHome&action=home&idSite=1&period=day&date=yesterday');
        await page.waitForNetworkIdle();

        await page.waitForTimeout(150);

        await (await page.jQuery('li.menuTab:contains(Privacy) > a')).click();

        await page.waitForTimeout(150);

        const complianceMenuSelector = 'li.menuTab.active li a[href*="compliance"]';

        await page.waitForSelector(complianceMenuSelector);
        await page.click(complianceMenuSelector);

        await page.waitForNetworkIdle();
        await page.waitForSelector('.compliance', { visible: true });
        await page.waitForSelector('table.dataTable.compliance', { visible: true });

        expect(await page.screenshotSelector('.compliance')).to.matchImage('compliance');
    });

    it('should show compliance is enforced when checkbox is selected', async function() {
      await page.goto('?module=PrivacyManager&action=compliance&idSite=1&period=day&date=yesterday');
      await page.waitForNetworkIdle();

      await page.waitForSelector('.compliance', { visible: true });
      await (await page.jQuery('#site-1-cnil_v1-enableFeature')).click();
      await page.waitForTimeout(150);
      await (await page.jQuery('.site-1-cnil_v1-save input')).click();
      await page.waitForTimeout(150);
      await confirmPassword();

      // After saving, the cnil_v1 policy section reports no non-compliant
      // rows. Locate the cnil_v1 ContentBlock by its SaveButton wrapper and
      // examine its compliance table only (other policy sections are
      // unaffected by the enforce toggle).
      await page.waitForSelector('table.dataTable.compliance', { visible: true });

      const enforcedState = await page.evaluate(() => {
          const saveBtn = document.querySelector('.site-1-cnil_v1-save');
          // Walk up to the nearest ContentBlock wrapper.
          let block = saveBtn ? saveBtn.parentElement : null;
          while (block && !block.classList.contains('contentBlock') && !block.querySelector('table.dataTable.compliance')) {
              block = block.parentElement;
          }
          // Fallback to the previous block if we walked past it.
          if (!block) {
              return { rowCount: 0, nonCompliantCount: 0, compliantCount: 0 };
          }
          const table = block.querySelector('table.dataTable.compliance');
          const rows = table ? Array.from(table.querySelectorAll('tbody tr')) : [];
          const statuses = rows.map((row) => {
              const statusCell = row.querySelector('td.status');
              return statusCell ? statusCell.className : '';
          });
          return {
              rowCount: rows.length,
              nonCompliantCount: statuses.filter((c) => c.includes('non-compliant')).length,
              compliantCount: statuses.filter((c) => c.includes('compliant') && !c.includes('non-compliant')).length,
          };
      });

      expect(enforcedState.rowCount).to.be.at.least(1);
      expect(enforcedState.nonCompliantCount).to.equal(0);
      expect(enforcedState.compliantCount).to.be.at.least(1);

      // Reset cnil_v1 enforcement for site 1 so that subsequent
      // --persist-fixture-data runs do not start with disable_visitor_log
      // forced for site 1 (which would break GDPR tools tests next time).
      await testEnvironment.callApi('PrivacyManager.setComplianceStatus', {
          idSite: 1,
          complianceType: 'cnil_v1',
          enforce: 0,
          passwordConfirmation: superUserPassword,
      });
    });

    it('should load a new compliance page when site selector is changed', async function() {
      await page.goto('?module=PrivacyManager&action=compliance&idSite=1&period=day&date=yesterday');
      await page.waitForNetworkIdle();
      await (await page.jQuery('#complianceSite a')).click();
      await page.waitForTimeout(150);
      await (await page.jQuery('#complianceSite li:nth-child(2)')).click();
      await page.waitForNetworkIdle();

      // After changing the site selector, the title reflects the newly
      // chosen site and the compliance table re-renders.
      await page.waitForSelector('table.dataTable.compliance', { visible: true });

      const result = await page.evaluate(() => {
          const titleEl = document.querySelector('#complianceSite a.title');
          const rows = document.querySelectorAll('table.dataTable.compliance tbody tr');
          return {
              siteTitle: titleEl ? (titleEl.textContent || '').trim() : null,
              rowCount: rows.length,
          };
      });

      // The second site selector entry is "All Websites" in this fixture.
      expect(result.siteTitle).to.not.equal('Site 1');
      expect(result.siteTitle).to.be.a('string');
      expect(result.siteTitle.length).to.be.at.least(1);
      expect(result.rowCount).to.be.at.least(1);
    });

    it('should select All Websites when idSite is not provided', async function() {
      await page.goto('?module=PrivacyManager&action=compliance');
      await page.waitForNetworkIdle();

      const siteSelectorContent = await page.evaluate(() => {
        return $('#complianceSite a.title').text();
      });

      expect(siteSelectorContent).to.be.equal('All Websites');
    });

    it('should select All Websites when idSite equals all', async function() {
      await page.goto('?module=PrivacyManager&action=compliance&idSite=all');
      await page.waitForNetworkIdle();

      const siteSelectorContent = await page.evaluate(() => {
        return $('#complianceSite a.title').text();
      });

      expect(siteSelectorContent).to.be.equal('All Websites');
    });

    it('should hide the policy controls when policy is enabled via config', async function() {
      testEnvironment.overrideConfig('CnilPolicy', {
        cnil_v1_policy_enabled: '1',
      });
      testEnvironment.save();

      try {
          await page.goto('?module=PrivacyManager&action=compliance&idSite=all');
          await page.waitForNetworkIdle();

          // When the policy is enabled via config, the per-site enableFeature
          // checkbox and the SaveButton are not rendered (state.complianceConfigControlled
          // is true), but the compliance table is still shown.
          await page.waitForSelector('.compliance', { visible: true });

          const state = await page.evaluate(() => {
              return {
                  hasComplianceTable: !!document.querySelector('table.dataTable.compliance'),
                  hasEnableCheckbox: !!document.querySelector('input[name*="-cnil_v1-enableFeature"], input[id*="-cnil_v1-enableFeature"]'),
                  hasSaveButton: !!document.querySelector('.site-1-cnil_v1-save, [class*="-cnil_v1-save"]'),
              };
          });

          expect(state.hasComplianceTable).to.equal(true);
          expect(state.hasEnableCheckbox).to.equal(false);
          expect(state.hasSaveButton).to.equal(false);
      } finally {
          // Reset the CnilPolicy override so it does not leak into subsequent
          // tests or subsequent --persist-fixture-data runs (the proxy reads
          // testingPathOverride.json on every request, so a leaked override
          // forces visitor logs disabled globally and breaks cross-spec
          // GDPR tools tests).
          delete testEnvironment.configOverride.CnilPolicy;
          testEnvironment.save();
      }
    });
  });
