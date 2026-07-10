const fs = require('fs');
const path = require('path');

const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

(async () => {
  let failed = 0;
  for (const file of files) {
    process.stdout.write(`\n=== ${file} ===\n`);
    try {
      await require(path.join(__dirname, file))();
      console.log(`PASS  ${file}`);
    } catch (e) {
      failed++;
      console.error(`FAIL  ${file}`);
      console.error(`      ${e.message}`);
    }
  }
  console.log(`\n${files.length - failed}/${files.length} test files passed`);
  process.exit(failed > 0 ? 1 : 0);
})();
