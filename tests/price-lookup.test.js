const { APP_URL, launchBrowser, collectPageErrors, assert, assertNoPageErrors } = require('./helpers');

module.exports = async function run() {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const errors = collectPageErrors(page);
    await page.goto(APP_URL);

    // fetchRealOffers must POST { name, brand, code } as JSON to the price-
    // lookup backend (not query params, not just the barcode) - this is the
    // whole point of the AI web-search backend: it looks products up by
    // name/brand, not by UPC lookup.
    let capturedBody = null;
    await page.route('**/api/price-lookup', (route) => {
      capturedBody = JSON.parse(route.request().postData());
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          offers: [
            { merchant: 'StoreA', price: 100, currency: 'USD', url: 'https://a.example/product' },
            { merchant: 'StoreB', price: 50, currency: 'EUR', url: 'https://b.example/product' },
          ],
        }),
      });
    });

    const t1 = await page.evaluate(async () => {
      const html = await buildComparison('Test Widget', 'Acme', '1234567890123');
      return html;
    });
    assert(capturedBody && capturedBody.name === 'Test Widget', 'expected product name in request body, got: ' + JSON.stringify(capturedBody));
    assert(capturedBody.brand === 'Acme', 'expected brand in request body, got: ' + JSON.stringify(capturedBody));
    assert(capturedBody.code === '1234567890123', 'expected barcode in request body, got: ' + JSON.stringify(capturedBody));
    assert(t1.includes('StoreB'), 'cheapest offer (StoreB, EUR 50) should appear in the comparison table');
    assert(t1.includes('data-badge-real'), 'real-data badge should render when offers are returned');

    await page.unroute('**/api/price-lookup');

    // No offers found (empty array, not an error) must fall back to the
    // "no real data" placeholder, not crash or show stale data.
    await page.route('**/api/price-lookup', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ offers: [] }) }),
    );
    const t2 = await page.evaluate(async () => buildComparison('Unknown Product', '', '000'));
    assert(!t2.includes('data-badge-real'), 'no offers should not render the real-data badge');
    await page.unroute('**/api/price-lookup');

    assertNoPageErrors(errors);
  } finally {
    await browser.close();
  }
};
