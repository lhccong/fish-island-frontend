// Usage: node scripts/generate-life-ages.cjs <remake-root> <xlsx-module-path>
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function readAges(remakeRoot, xlsx) {
  const source = path.join(remakeRoot, 'packages/data/src');
  const workbook = xlsx.readFile(path.join(source, 'age.xlsx'));
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets.age, { header: 1, raw: true });
  const grouped = new Map();
  for (const row of rows.slice(2)) {
    if (row[0] === undefined || row[0] === '') continue;
    const age = Number(row[0]);
    if (!Number.isInteger(age)) throw new Error(`Invalid age: ${row[0]}`);
    const pool = grouped.get(age) || [];
    pool.push(...row.slice(1).filter(value => value !== undefined && value !== null && value !== ''));
    grouped.set(age, pool);
  }
  // Run the source repository's transformer to preserve priority and weight scaling.
  const compiled = ts.transpileModule(
    fs.readFileSync(path.join(source, 'age.types.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports = {};
  new Function('exports', compiled)(exports);
  return Array.from(grouped, ([age, pool]) => [age, {
    age,
    event: exports.transformers.event(pool),
  }]);
}

function readLocalEvents() {
  const source = path.join(__dirname, '../src/pages/Game/Life/engine/data/event.ts');
  const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function('exports', compiled)(exports);
  return exports.default;
}

module.exports = { readAges, readLocalEvents };
if (require.main === module) {
  const entries = readAges(path.resolve(process.argv[2]), require(process.argv[3] || 'xlsx'));
  const localEvents = readLocalEvents();
  // Append to ordinary pools; branch outcomes only occur through their parent event.
  for (const [age, row] of entries) {
    if (age >= 500) continue;
    let index = row.event.length - 1;
    while (index > 0 && row.event[index].length === 0) index -= 1;
    for (const [id, event] of localEvents) {
      if (event.ages && !event.NoRandom && age >= event.ages[0] && age <= event.ages[1]) {
        row.event[index].push([id, 1]);
      }
    }
    if (age < 18) continue;
    if (age <= 60) row.event[index].push([900001, 1]);
    row.event[index].push([900002, 1]);
  }
  const target = path.join(__dirname, '../src/pages/Game/Life/engine/data/age.ts');
  fs.writeFileSync(target,
    "import type { Age } from './age.types';\n\n" +
    '// Generated from remake age.xlsx; local event age ranges are defined in event.ts.\n' +
    `const data = new Map<number, Age>(${JSON.stringify(entries, null, 2)});\nexport default data;\n`,
  );
  console.log(`Generated ${entries.length} age pools`);
}
