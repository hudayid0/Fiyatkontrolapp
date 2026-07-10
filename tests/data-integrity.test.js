const { APP_URL, launchBrowser, collectPageErrors, assert, assertNoPageErrors } = require('./helpers');

module.exports = async function run() {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const errors = collectPageErrors(page);
    await page.goto(APP_URL);

    // Corrupted localStorage must be backed up before being silently
    // replaced with an empty array, so a subsequent save() can never
    // permanently destroy data that might still be recoverable.
    const t1 = await page.evaluate(() => {
      localStorage.setItem('fiyatla_tracked_items', 'THIS IS NOT VALID JSON {{{');
      const items = getTrackedItems();
      const backupRaw = localStorage.getItem('fiyatla_tracked_items_corrupted_backup');
      return { items, backupRaw };
    });
    assert(Array.isArray(t1.items) && t1.items.length === 0, 'expected empty array from corrupted tracked-items data');
    assert(t1.backupRaw && t1.backupRaw.includes('THIS IS NOT VALID JSON'), 'corrupted data was not backed up before falling back to []');

    const t2 = await page.evaluate(() => {
      localStorage.setItem('fiyatla_search_history', 'ALSO NOT JSON !!!');
      const history = getSearchHistory();
      const backupRaw = localStorage.getItem('fiyatla_search_history_corrupted_backup');
      return { history, backupRaw };
    });
    assert(Array.isArray(t2.history) && t2.history.length === 0, 'expected empty array from corrupted search-history data');
    assert(t2.backupRaw && t2.backupRaw.includes('ALSO NOT JSON'), 'corrupted search history was not backed up before falling back to []');

    // Normal save/load must still round-trip correctly (no regression).
    const t3 = await page.evaluate(() => {
      saveTrackedItems([{ id: '1', name: 'Test', brand: 'B', code: '123', targetPrice: 5 }]);
      return getTrackedItems();
    });
    assert(t3.length === 1 && t3[0].name === 'Test', 'normal save/load round-trip broke');

    // saveTrackedItems() must not throw uncaught even if localStorage.setItem
    // fails (e.g. quota exceeded).
    const t4 = await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      let threw = null;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'fiyatla_tracked_items') throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        return original.call(this, key, value);
      };
      try {
        saveTrackedItems([{ id: '1', name: 'X' }]);
      } catch (e) {
        threw = e.message;
      } finally {
        Storage.prototype.setItem = original;
      }
      return { threw };
    });
    assert(!t4.threw, 'saveTrackedItems still throws uncaught on quota exceeded: ' + t4.threw);

    // Imported backup items must be sanitized: wrong-typed fields coerced
    // or dropped, oversized arrays capped.
    const oversizedBackup = {
      app: 'fiyatla',
      version: 2,
      tracked: Array.from({ length: 600 }, (_, i) => ({ id: 'id' + i, name: 'Item ' + i, brand: 'B', code: 'c', targetPrice: 1 })),
      searchHistory: [],
    };
    const encodedOversized = Buffer.from(unescape(encodeURIComponent(JSON.stringify(oversizedBackup))), 'binary').toString('base64');
    const t5 = await page.evaluate(async (encoded) => {
      window.goTo('tracking');
      importBackup();
      document.getElementById('import-text-input').value = encoded;
      confirmImportBackup();
      await new Promise((r) => setTimeout(r, 200));
      return getTrackedItems().length;
    }, encodedOversized);
    assert(t5 <= 500, 'IMPORT_MAX_ITEMS cap was not enforced, got ' + t5 + ' items');

    const malformedItemBackup = {
      app: 'fiyatla',
      version: 2,
      tracked: [
        { id: 'ok1', name: 'Valid item', brand: 'B', code: 'c', targetPrice: 5 },
        { id: '', name: 'Missing id should be dropped', brand: 'B' },
        { name: 'Missing name entirely - id present' },
        { id: 'ok2', name: 'Weird target price', targetPrice: 'not-a-number' },
      ],
      searchHistory: [],
    };
    const encodedMalformed = Buffer.from(unescape(encodeURIComponent(JSON.stringify(malformedItemBackup))), 'binary').toString('base64');
    const t6 = await page.evaluate(async (encoded) => {
      window.goTo('tracking');
      importBackup();
      document.getElementById('import-text-input').value = encoded;
      confirmImportBackup();
      await new Promise((r) => setTimeout(r, 200));
      return getTrackedItems();
    }, encodedMalformed);
    assert(t6.length === 2, 'expected exactly 2 valid items to survive sanitization, got ' + t6.length);
    assert(t6.some((i) => i.id === 'ok2' && i.targetPrice === 0), 'non-numeric targetPrice should be coerced to 0, not dropped');

    assertNoPageErrors(errors);
  } finally {
    await browser.close();
  }
};
