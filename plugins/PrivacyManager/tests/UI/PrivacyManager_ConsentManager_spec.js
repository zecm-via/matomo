/*!
 * Matomo - free/libre analytics platform
 *
 * Screenshot integration tests.
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

describe("PrivacyManager_ConsentManager", function () {
    this.fixture = "Piwik\\Tests\\Fixtures\\EmptySite";

    var generalParams = 'idSite=1&period=day&date=2017-01-02',
        urlBase = '?module=PrivacyManager&' + generalParams + '&action=';

    before(function () {
        testEnvironment.pluginsToLoad = ['PrivacyManager'];
        testEnvironment.detectedContentDetections = ['Osano'];
        testEnvironment.connectedConsentManagers = ['Osano'];
        testEnvironment.save();
    });

    after(function () {
        testEnvironment.detectedContentDetections = [];
        testEnvironment.connectedConsentManagers = [];
        testEnvironment.save();
    });

    it('should load privacy asking for consent page', async function() {
        await page.goto(urlBase + 'consent');
        await page.waitForNetworkIdle();

        // The detected consent manager block is only rendered when a known
        // consent manager is connected (Osano in this fixture). Assert the
        // dedicated content block exists and references the connected manager.
        await page.waitForSelector('.privacyAskingForConsent', { visible: true });

        const consentManagerBlock = await page.evaluate(() => {
            const blocks = Array.from(document.querySelectorAll('.privacyAskingForConsent'));
            const detected = blocks.find((el) => /Osano/i.test(el.textContent || ''));
            return detected ? detected.textContent.trim() : null;
        });

        expect(consentManagerBlock).to.be.a('string');
        expect(consentManagerBlock).to.contain('Osano');
        expect(consentManagerBlock).to.contain('consent manager');
    });
});
