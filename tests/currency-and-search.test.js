const { APP_URL, launchBrowser, collectPageErrors, assert, assertNoPageErrors } = require('./helpers');

module.exports = async function run() {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const errors = collectPageErrors(page);
    await page.goto(APP_URL);

    // AED was removed entirely (Frankfurter has no live rate for it, and a
    // fixed-peg-only currency was judged misleading for a "live rate" app).
    const t1 = await page.evaluate(() => ({
      currencies: CURRENCIES,
      currencyNamesHasAed: 'AED' in CURRENCY_NAMES,
      ratesHasAed: 'AED' in RATES_TO_EUR,
    }));
    assert(!t1.currencies.includes('AED'), 'AED should not be in CURRENCIES');
    assert(!t1.currencyNamesHasAed, 'AED should not be in CURRENCY_NAMES');
    assert(!t1.ratesHasAed, 'AED should not be in RATES_TO_EUR');

    // Basic conversion still works after AED removal.
    const t2 = await page.evaluate(() => {
      window.goTo('convert');
      document.getElementById('amount').value = '100';
      document.getElementById('from-currency').value = 'USD';
      document.getElementById('to-currency').value = 'EUR';
      onCurrencyChange();
      doConvert();
      return document.getElementById('convert-result').innerHTML;
    });
    assert(t2.includes('EUR'), 'basic USD->EUR conversion broke');

    // Name search: when a native CapacitorHttp bridge is present (real
    // Android/iOS), it must be used instead of fetch() - the search-a-licious
    // endpoint does not send permissive CORS headers, so a plain WebView
    // fetch() fails with "Failed to fetch" before any response is read.
    let fetchWasCalled = false;
    await page.route('**/search.openfoodfacts.org/**', (route) => {
      fetchWasCalled = true;
      route.abort();
    });
    const t3 = await page.evaluate(async () => {
      window.Capacitor = {
        Plugins: {
          CapacitorHttp: {
            get: async (opts) => ({
              status: 200,
              data: { hits: [{ code: '111', product_name: 'Native Path Product', brands: 'BrandX' }] },
            }),
          },
        },
      };
      window.__lastActionTime.searchByName = 0;
      window.goTo('scan');
      setSearchMode('name');
      document.getElementById('product-name').value = 'test';
      await searchByName();
      return document.getElementById('scan-result').innerHTML;
    });
    assert(!fetchWasCalled, 'fetch() should not be called when CapacitorHttp is available (defeats the CORS bypass)');
    assert(t3.includes('Native Path Product'), 'native CapacitorHttp search path did not render results');
    await page.unroute('**/search.openfoodfacts.org/**');

    // Without a native bridge (plain web), it must still fall back to fetch().
    await page.route('**/search.openfoodfacts.org/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hits: [{ code: '222', product_name: 'Web Fallback Product', brands: 'BrandY' }] }),
      }),
    );
    const t4 = await page.evaluate(async () => {
      delete window.Capacitor;
      window.__lastActionTime.searchByName = 0;
      document.getElementById('product-name').value = 'test2';
      await searchByName();
      return document.getElementById('scan-result').innerHTML;
    });
    assert(t4.includes('Web Fallback Product'), 'plain fetch() fallback path (no Capacitor) did not render results');

    assertNoPageErrors(errors);
  } finally {
    await browser.close();
  }
};
