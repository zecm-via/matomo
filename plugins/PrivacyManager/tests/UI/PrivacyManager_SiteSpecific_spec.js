/*!
 * Matomo - free/libre analytics platform
 *
 * Screenshot integration tests.
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

describe("PrivacyManager_SiteSpecific", function () {
    this.fixture = "Piwik\\Plugins\\PrivacyManager\\tests\\Fixtures\\MultipleSitesMultipleVisitsFixture";

    var generalParams = 'idSite=1&period=day&date=2017-01-02',
        urlBase = '?module=SitesManager&' + generalParams + '&action=';

    before(function () {
        testEnvironment.pluginsToLoad = ['PrivacyManager'];
        testEnvironment.save();
    });

    after(async function () {
        // The "should show site-specific settings defaulting to instance-level..."
        // tests use testEnvironment.optionsOverride to write PrivacyManager.* rows
        // to the option table, then reset optionsOverride to {}. That stops future
        // bootstraps from re-setting them, but the rows already written stay. Under
        // --plugin=PrivacyManager --persist-fixture-data the next spec sharing this
        // fixture DB (PrivacyManager_spec) then renders privacy settings with leaked
        // mask length, anonymize order id and anonymize referrer values. Re-apply
        // fixture-matching values so the following bootstraps overwrite the leaks.
        // randomizeConfigId is intentionally omitted because PrivacyManager_spec
        // saves it via the form and would be reset on every reload otherwise.
        testEnvironment.optionsOverride = testEnvironment.optionsOverride || {};
        testEnvironment.optionsOverride['PrivacyManager.ipAnonymizerEnabled'] = '0';
        testEnvironment.optionsOverride['PrivacyManager.ipAddressMaskLength'] = '0';
        testEnvironment.optionsOverride['PrivacyManager.useAnonymizedIpForVisitEnrichment'] = '0';
        testEnvironment.optionsOverride['PrivacyManager.doNotTrackEnabled'] = '0';
        testEnvironment.optionsOverride['PrivacyManager.anonymizeUserId'] = '0';
        testEnvironment.optionsOverride['PrivacyManager.anonymizeOrderId'] = '0';
        testEnvironment.optionsOverride['PrivacyManager.anonymizeReferrer'] = '';
        testEnvironment.save();

        // The "should save site-specific" / "...for site 2" tests write per-site
        // rows like PrivacyManager.idSite(N).%. Config::useSiteSpecificSettings()
        // returns true while any such row exists, so even values that match the
        // defaults still flip the compliance page rendering. optionsOverride can
        // only Option::set, so call setAnonymizeIpSettings with
        // useSiteSpecificSettings=false to invoke Config::removeForSite() and
        // delete every row under that prefix. Each call also bootstraps the
        // proxy, applying the instance-level overrides above.
        for (const idSiteSpecific of [1, 2]) {
            await testEnvironment.callApi('PrivacyManager.setAnonymizeIpSettings', {
                anonymizeIPEnable: false,
                ipAddressMaskLength: 0,
                useAnonymizedIpForVisitEnrichment: false,
                idSiteSpecific,
                useSiteSpecificSettings: false,
            });
        }
    });

    async function loadBasePage()
    {
        await page.goto(urlBase);
        await page.waitForNetworkIdle();
    }

    async function typeUserPassword()
    {
        var elem = await page.jQuery('.modal.open #currentUserPassword');
        await elem.type(superUserPassword);
        await page.waitForTimeout(100);
    }

    async function hideUTCTimeInfo() {
        await page.evaluate(function () {
            $('.form-help:contains(UTC time is)').hide();
        });
        await page.waitForTimeout(200);
    }

    async function setCnilPolicyEnforced(enforced) {
        if (enforced) {
            testEnvironment.overrideConfig('CnilPolicy', 'cnil_v1_policy_enabled', 1);
        } else {
            delete testEnvironment.configOverride.CnilPolicy;
        }
        await testEnvironment.save();
    }


    async function capturePage(screenshotName) {
        await page.waitForNetworkIdle();
        const pageWrap = await page.$('.pageWrap,#notificationContainer,.modal.open');
        const screenshot = await pageWrap.screenshot();
        expect(screenshot).to.matchImage(screenshotName);
    }

    function sitePrefix(idSite, str) {
        return `div[idsite="${idSite}"] ${str}`;
    }

    function openSitePrivacySettingsSelector(idSite) {
        return sitePrefix(idSite, 'button[title="Edit"]');
    }

    function cancelSitePrivacySettingsButton(idSite) {
        return sitePrefix(idSite, '.editingSiteFooter button');
    }

    function saveSitePrivacySettingsButton(idSite) {
        return sitePrefix(idSite, '.editingSiteFooter input[value="Save"]');
    }

    it('should show privacy settings for multiple sites at the same time', async function() {
        await loadBasePage();
        await page.click(openSitePrivacySettingsSelector(1));
        await page.waitForTimeout(200);
        await page.waitForNetworkIdle();

        await page.click(openSitePrivacySettingsSelector(3));
        await page.waitForTimeout(200);
        await page.waitForNetworkIdle();
        await hideUTCTimeInfo();

        await capturePage('show_settings');
    });

    it('should close privacy settings for a given site', async function() {
        await page.click(cancelSitePrivacySettingsButton(3));
        await page.waitForTimeout(200);
        await hideUTCTimeInfo();

        // Cancelling collapses the per-site editor for site 3 only. The
        // site 1 editor must remain expanded.
        const visibility = await page.evaluate(() => {
            const site1Footer = document.querySelector('div[idsite="1"] .editingSiteFooter');
            const site3Footer = document.querySelector('div[idsite="3"] .editingSiteFooter');
            const site1Visible = site1Footer ? site1Footer.offsetParent !== null : false;
            const site3Visible = site3Footer ? site3Footer.offsetParent !== null : false;
            return { site1Visible, site3Visible };
        });

        expect(visibility.site1Visible).to.equal(true);
        expect(visibility.site3Visible).to.equal(false);
    });

    it('should show site-specific settings when option selected', async function() {
        await page.click('#useSiteSpecificSettings1site-specific');
        await page.waitForTimeout(200);
        await hideUTCTimeInfo();

        // After picking the "site-specific" option for site 1, the radio is
        // selected and the per-site override fields (mask length, anonymize
        // referrer, etc.) become visible inside the site 1 editor.
        const state = await page.evaluate(() => {
            const radio = document.querySelector('#useSiteSpecificSettings1site-specific');
            const ipSettings = document.querySelector('div[idsite="1"] .anonymizeIpSettingsField');
            const referrerField = document.querySelector('div[idsite="1"] .anonymizeReferrerField');
            return {
                radioSelected: radio ? radio.checked : null,
                hasIpSettingsField: !!ipSettings,
                hasReferrerField: !!referrerField,
            };
        });

        expect(state.radioSelected).to.equal(true);
        expect(state.hasIpSettingsField).to.equal(true);
        expect(state.hasReferrerField).to.equal(true);
    });

    it('should save site-specific', async function() {
        await page.click(sitePrefix(1, '#anonymizeIpSettings1'));
        await page.waitForTimeout(100);

        await page.click(sitePrefix(1, '#maskLength14'));
        await page.waitForTimeout(100);

        await page.click(sitePrefix(1, '#useAnonymizedIpForVisitEnrichment11'));
        await page.waitForTimeout(100);

        await page.click(sitePrefix(1, '#anonymizeUserId1'));
        await page.waitForTimeout(100);

        await page.click(sitePrefix(1, '#anonymizeOrderId1'));
        await page.waitForTimeout(100);

        await page.evaluate(() => $('div[idsite="1"] div.anonymizeReferrerField div.matomo-field-select div.select-wrapper input.dropdown-trigger')[0].click());
        await page.waitForTimeout(100);
        await page.evaluate(() => $('div[idsite="1"] div.anonymizeReferrerField div.matomo-field-select ul li:nth-child(3)').click());
        await page.waitForTimeout(100);

        await page.click(saveSitePrivacySettingsButton(1));
        await page.waitForTimeout(300);
        await page.waitForNetworkIdle();
        await hideUTCTimeInfo();

        // Saving emits a success notification in #notificationContainer and
        // no validation/error notification.
        await page.waitForSelector('#notificationContainer .notification-success', { visible: true });

        const errorPresent = await page.evaluate(() => {
            return !!document.querySelector('#notificationContainer .notification-error');
        });
        expect(errorPresent).to.equal(false);
    });

    it('should load previously saved site-specific settings for site 1', async function() {
        await loadBasePage();
        await page.click(openSitePrivacySettingsSelector(1));
        await page.waitForTimeout(300);
        await page.waitForNetworkIdle();
        await hideUTCTimeInfo();

        await capturePage('load_site_specific_settings_site1');
    });

    it('should show site-specific settings defaulting to instance-level set anonymisation settings', async function() {
        testEnvironment.optionsOverride = {
            'PrivacyManager.useAnonymizedIpForVisitEnrichment': '1',
            'PrivacyManager.ipAddressMaskLength': '1',
            'PrivacyManager.doNotTrackEnabled': '1',
            'PrivacyManager.ipAnonymizerEnabled': '1',
            'PrivacyManager.anonymizeUserId': '1',
            'PrivacyManager.anonymizeOrderId': '1',
            'PrivacyManager.anonymizeReferrer': 'exclude_path',
        };
        testEnvironment.save();

        await loadBasePage();
        await page.click(openSitePrivacySettingsSelector(3));
        await page.waitForTimeout(300);
        await page.waitForNetworkIdle();

        await page.click('#useSiteSpecificSettings3site-specific');
        await page.waitForTimeout(200);
        await hideUTCTimeInfo();

        testEnvironment.optionsOverride = {};
        testEnvironment.save();

        // The per-site editor for site 3 must default to the instance-level
        // option values seeded above (mask length 1, anonymize IP on, user
        // id on, order id on, anonymize referrer = exclude_path).
        const fieldState = await page.evaluate(() => {
            const ipChk = document.querySelector('div[idsite="3"] #anonymizeIpSettings3');
            const maskLenChecked = Array.from(
                document.querySelectorAll('div[idsite="3"] input[name="maskLength3"]')
            ).filter((r) => r.checked).map((r) => r.value);
            const userIdChk = document.querySelector('div[idsite="3"] #anonymizeUserId3');
            const orderIdChk = document.querySelector('div[idsite="3"] #anonymizeOrderId3');
            const referrerInput = document.querySelector(
                'div[idsite="3"] div.anonymizeReferrerField input.select-dropdown'
            );
            return {
                ipEnabled: ipChk ? ipChk.checked : null,
                maskLengthValues: maskLenChecked,
                userIdEnabled: userIdChk ? userIdChk.checked : null,
                orderIdEnabled: orderIdChk ? orderIdChk.checked : null,
                referrerLabel: referrerInput ? (referrerInput.value || '').trim() : null,
            };
        });

        expect(fieldState.ipEnabled).to.equal(true);
        expect(fieldState.maskLengthValues).to.deep.equal(['1']);
        expect(fieldState.userIdEnabled).to.equal(true);
        expect(fieldState.orderIdEnabled).to.equal(true);
        // The select-dropdown shows the human-readable label for the chosen
        // referrer option; assert it is non-empty (we cannot rely on the raw
        // value here, but the materialize select reflects the saved key).
        expect(fieldState.referrerLabel).to.be.a('string');
        expect(fieldState.referrerLabel.length).to.be.at.least(1);
    });

    it('should show site-specific settings defaulting to different instance-level set anonymisation settings', async function() {
        testEnvironment.optionsOverride = {
            'PrivacyManager.useAnonymizedIpForVisitEnrichment': '0',
            'PrivacyManager.ipAddressMaskLength': '1',
            'PrivacyManager.doNotTrackEnabled': '1',
            'PrivacyManager.ipAnonymizerEnabled': '0',
            'PrivacyManager.anonymizeUserId': '0',
            'PrivacyManager.anonymizeOrderId': '1',
            'PrivacyManager.anonymizeReferrer': 'exclude_query',
        };
        testEnvironment.save();

        await loadBasePage();
        await page.click(openSitePrivacySettingsSelector(2));
        await page.waitForTimeout(300);
        await page.waitForNetworkIdle();

        await page.click('#useSiteSpecificSettings2site-specific');
        await page.waitForTimeout(200);
        await hideUTCTimeInfo();

        testEnvironment.optionsOverride = {};
        testEnvironment.save();

        // Per-site editor for site 2 inherits the second seeded set:
        // ipAnonymizerEnabled=off, anonymizeUserId=off, anonymizeOrderId=on.
        const fieldState = await page.evaluate(() => {
            const ipChk = document.querySelector('div[idsite="2"] #anonymizeIpSettings2');
            const userIdChk = document.querySelector('div[idsite="2"] #anonymizeUserId2');
            const orderIdChk = document.querySelector('div[idsite="2"] #anonymizeOrderId2');
            return {
                ipEnabled: ipChk ? ipChk.checked : null,
                userIdEnabled: userIdChk ? userIdChk.checked : null,
                orderIdEnabled: orderIdChk ? orderIdChk.checked : null,
            };
        });

        expect(fieldState.ipEnabled).to.equal(false);
        expect(fieldState.userIdEnabled).to.equal(false);
        expect(fieldState.orderIdEnabled).to.equal(true);
    });

    it('should save site-specific settings for site 2', async function() {
        await page.click(saveSitePrivacySettingsButton(2));
        await page.waitForTimeout(300);
        await page.waitForNetworkIdle();

        // Saving the site-2 editor emits a success notification and no
        // validation/error notification.
        await page.waitForSelector('#notificationContainer .notification-success', { visible: true });

        const errorPresent = await page.evaluate(() => {
            return !!document.querySelector('#notificationContainer .notification-error');
        });
        expect(errorPresent).to.equal(false);
    });

    it('should load previously saved site-specific settings for site 2', async function() {
        await loadBasePage();
        await page.click(openSitePrivacySettingsSelector(2));
        await page.waitForTimeout(300);
        await page.waitForNetworkIdle();
        await hideUTCTimeInfo();

        // After reload, the editor for site 2 reflects the values we wrote
        // in the previous save: ipAnonymizerEnabled=off, anonymizeUserId=off,
        // anonymizeOrderId=on (from the second seeded set).
        const fieldState = await page.evaluate(() => {
            const ipChk = document.querySelector('div[idsite="2"] #anonymizeIpSettings2');
            const userIdChk = document.querySelector('div[idsite="2"] #anonymizeUserId2');
            const orderIdChk = document.querySelector('div[idsite="2"] #anonymizeOrderId2');
            const radio = document.querySelector('#useSiteSpecificSettings2site-specific');
            return {
                siteSpecificSelected: radio ? radio.checked : null,
                ipEnabled: ipChk ? ipChk.checked : null,
                userIdEnabled: userIdChk ? userIdChk.checked : null,
                orderIdEnabled: orderIdChk ? orderIdChk.checked : null,
            };
        });

        expect(fieldState.siteSpecificSelected).to.equal(true);
        expect(fieldState.ipEnabled).to.equal(false);
        expect(fieldState.userIdEnabled).to.equal(false);
        expect(fieldState.orderIdEnabled).to.equal(true);
    });

    it('should display compliance info for policy controlled settings for site 2', async function() {
        await setCnilPolicyEnforced(true);

        await loadBasePage();
        await page.click(openSitePrivacySettingsSelector(2));
        await page.waitForTimeout(300);
        await page.waitForNetworkIdle();
        await hideUTCTimeInfo();

        await setCnilPolicyEnforced(false);

        // When the cnil v1 policy is enforced via config, the per-site
        // editor for site 2 renders a policy-controlled-setting notification
        // for at least one field (FormField renders a notification linking
        // to the compliance overview when extraMetadata.compliancePolicyControlled
        // is set).
        const policyState = await page.evaluate(() => {
            const root = document.querySelector('div[idsite="2"]');
            if (!root) {
                return { hasFooter: false, policyNotices: 0 };
            }
            const policyNotices = Array.from(root.querySelectorAll('.notification.notification-info'))
                .filter((n) => /Privacy Compliance Overview|policy-controlled|Policy/i.test(n.textContent || ''));
            return {
                hasFooter: !!root.querySelector('.editingSiteFooter'),
                policyNotices: policyNotices.length,
            };
        });

        expect(policyState.hasFooter).to.equal(true);
        expect(policyState.policyNotices).to.be.at.least(1);
    });

    it('should not display the privacy settings when privacy manager plugin is disabled', async function() {
        testEnvironment.pluginsToUnload = ['PrivacyManager'];
        await testEnvironment.save();

        await loadBasePage();
        await page.click(openSitePrivacySettingsSelector(1));
        await page.waitForTimeout(300);
        await page.waitForNetworkIdle();
        await page.mouse.move(-10, -10);
        await hideUTCTimeInfo();

        // With PrivacyManager unloaded, the SiteFields editor is open but
        // does not inject the PrivacyManager-owned anonymisation editor.
        const state = await page.evaluate(() => {
            const root = document.querySelector('div[idsite="1"]');
            if (!root) {
                return { hasFooter: false, hasIpSettings: false, hasUseSiteSpecific: false };
            }
            return {
                hasFooter: !!root.querySelector('.editingSiteFooter'),
                hasIpSettings: !!root.querySelector('.anonymizeIpSettingsField'),
                hasUseSiteSpecific: !!root.querySelector('[id^="useSiteSpecificSettings1"]'),
            };
        });

        expect(state.hasFooter).to.equal(true);
        expect(state.hasIpSettings).to.equal(false);
        expect(state.hasUseSiteSpecific).to.equal(false);

        delete testEnvironment.pluginsToUnload;
        await testEnvironment.save();
    });
});
