const { APP_URL, launchBrowser, collectPageErrors, assert, assertNoPageErrors } = require('./helpers');

module.exports = async function run() {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const errors = collectPageErrors(page);
    await page.goto(APP_URL);

    // Branding/i18n basics.
    const t1 = await page.evaluate(() => ({ title: document.title, htmlLang: document.documentElement.lang }));
    assert(t1.title === 'Fiyatla', 'document title should be the app name "Fiyatla", got: ' + t1.title);
    assert(t1.htmlLang === 'tr', 'expected default html lang "tr", got: ' + t1.htmlLang);

    // A saved language preference must be reflected in <html lang> on cold
    // start too, not only after the user manually switches language.
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto(APP_URL);
    await page2.evaluate(() => localStorage.setItem('fiyatla_lang', 'en'));
    await page2.reload();
    const langAfterReload = await page2.evaluate(() => document.documentElement.lang);
    assert(langAfterReload === 'en', 'html lang did not reflect a saved preference on cold start, got: ' + langAfterReload);
    await context2.close();

    // Onboarding renders the 3-step icon flow (scan -> track -> notify).
    const t2 = await page.evaluate(() => {
      showOnboardingModal();
      const overlay = document.getElementById('onboarding-modal-overlay');
      const steps = overlay.querySelectorAll('.onboarding-step');
      const arrows = overlay.querySelectorAll('.onboarding-arrow');
      return { stepCount: steps.length, arrowCount: arrows.length };
    });
    assert(t2.stepCount === 3, 'expected 3 onboarding steps, got ' + t2.stepCount);
    assert(t2.arrowCount === 2, 'expected 2 arrows between onboarding steps, got ' + t2.arrowCount);

    // UPCitemDB 429 (daily quota exceeded) must surface a distinct,
    // actionable message - not the generic "no data found" message.
    await page.route('**/api.upcitemdb.com/**', (route) => route.fulfill({ status: 429, body: 'Too Many Requests' }));
    const t3 = await page.evaluate(async () => {
      saveTrackedItems([{ id: 'x1', name: 'Test Product', brand: 'B', code: '123', targetPrice: 5, hasRealPriceData: false }]);
      const toasts = [];
      const orig = window.showToast;
      window.showToast = (msg) => toasts.push(msg);
      await checkPriceNow('x1');
      window.showToast = orig;
      return { toasts, hasRealPriceData: getTrackedItems()[0].hasRealPriceData };
    });
    assert(t3.toasts.some((m) => m.includes('limit')), 'expected a rate-limit-specific toast, got: ' + JSON.stringify(t3.toasts));
    assert(t3.hasRealPriceData === false, 'hasRealPriceData should stay unchanged on rate-limit, got: ' + t3.hasRealPriceData);
    await page.unroute('**/api.upcitemdb.com/**');

    assertNoPageErrors(errors);
  } finally {
    await browser.close();
  }
};
