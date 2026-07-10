const path = require('path');
const { chromium } = require('playwright');

const APP_URL = 'file://' + path.resolve(__dirname, '..', 'www', 'index.html');

// CI (a fresh GitHub Actions runner) installs its own Chromium via
// `npx playwright install chromium` at Playwright's default location, so
// chromium.launch() needs no extra options there. Local dev sandboxes that
// pre-provision a browser at a fixed path can point PLAYWRIGHT_EXECUTABLE_PATH
// at it instead of re-downloading.
function launchBrowser() {
  const options = process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {};
  return chromium.launch(options);
}

// Collects uncaught in-page JS errors into an array instead of throwing
// from inside the event listener (an exception thrown there would not
// reliably propagate to the caller's try/catch). Call assertNoPageErrors()
// after driving the page to fail the test if anything was thrown.
function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

function assert(condition, message) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

function assertNoPageErrors(errors) {
  assert(errors.length === 0, 'Unexpected in-page JS error(s): ' + errors.join(' | '));
}

module.exports = { APP_URL, launchBrowser, collectPageErrors, assert, assertNoPageErrors };
