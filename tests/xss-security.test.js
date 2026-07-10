const { APP_URL, launchBrowser, collectPageErrors, assert, assertNoPageErrors } = require('./helpers');

module.exports = async function run() {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const errors = collectPageErrors(page);
    let xssFired = false;
    await page.exposeFunction('__xssProbe', () => { xssFired = true; });
    await page.route('**/api.upcitemdb.com/**', (route) => route.abort());
    await page.route('**/api.frankfurter.dev/**', (route) => route.abort());
    await page.goto(APP_URL);

    // Apostrophe in a scanned product's name/brand must not break the
    // "track this product" button (regression: onclick attribute JS-string
    // escaping was previously broken for names like "Kellogg's").
    const t1 = await page.evaluate(() => {
      window.goTo('scan');
      renderProductResult({ product_name: "Kellogg's Corn Flakes", brands: "Ben & Jerry's", code: '1234567890123' }, '1234567890123');
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.getAttribute('onclick')?.includes('promptTrackProduct'));
      btn.click();
      const title = document.querySelector('#track-modal-overlay .modal-title')?.textContent;
      return { title };
    });
    assert(t1.title === "Kellogg's Corn Flakes", 'apostrophe product name should render correctly in track modal, got: ' + t1.title);

    // A malicious product name (as could appear in crowd-sourced Open Food
    // Facts / UPCitemDB data) must render as inert text, never execute.
    const t2 = await page.evaluate(() => {
      saveTrackedItems([]);
      window.goTo('scan');
      renderProductResult(
        { product_name: '<img src=x onerror="window.__xssProbe && window.__xssProbe()">', brands: 'EvilBrand', code: '999' },
        '999',
      );
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.getAttribute('onclick')?.includes('promptTrackProduct'));
      btn.click();
      document.getElementById('target-price-input').value = '1.00';
      document.querySelector('#track-modal-overlay .modal-btn-primary').click();
      return true;
    });
    await page.waitForTimeout(300);
    const t2b = await page.evaluate(() => {
      window.goTo('tracking');
      const nameEl = document.querySelector('.pname');
      return { text: nameEl.textContent, hasImgTag: !!nameEl.querySelector('img') };
    });
    assert(!xssFired, 'XSS payload via scanned product name executed!');
    assert(!t2b.hasImgTag, 'raw <img> tag was rendered as a real element, not escaped text');
    assert(t2b.text.includes('<img'), 'expected literal <img...> text to be visible');

    // A malicious *imported backup* (crafted name AND id fields) must be
    // neutralized both at render time and when its button is clicked.
    const maliciousBackup = {
      app: 'fiyatla',
      version: 2,
      tracked: [
        {
          id: "x'); window.__xssProbe && window.__xssProbe(); //",
          name: '<img src=x onerror="window.__xssProbe && window.__xssProbe()">',
          brand: 'B',
          code: '1',
          targetPrice: 5,
        },
      ],
      searchHistory: [],
    };
    const encoded = Buffer.from(unescape(encodeURIComponent(JSON.stringify(maliciousBackup))), 'binary').toString('base64');
    await page.evaluate(async (encodedBackup) => {
      saveTrackedItems([]);
      window.goTo('tracking');
      importBackup();
      document.getElementById('import-text-input').value = encodedBackup;
      confirmImportBackup();
      await new Promise((r) => setTimeout(r, 200));
    }, encoded);
    const t3 = await page.evaluate(() => {
      window.goTo('tracking');
      const nameEl = document.querySelector('.pname');
      const checkNowBtn = document.querySelector('.go-btn');
      return {
        text: nameEl ? nameEl.textContent : null,
        hasImgTag: nameEl ? !!nameEl.querySelector('img') : null,
        onclickAttr: checkNowBtn ? checkNowBtn.getAttribute('onclick') : null,
      };
    });
    assert(!t3.hasImgTag, 'raw <img> tag from imported backup was rendered as a real element');
    assert(t3.onclickAttr && t3.onclickAttr.includes("x\\'"), 'malicious id in onclick handler was not properly escaped');
    await page.evaluate(() => document.querySelector('.go-btn').click());
    await page.waitForTimeout(200);
    assert(!xssFired, 'XSS payload from malicious imported backup executed!');

    assertNoPageErrors(errors);
  } finally {
    await browser.close();
  }
};
