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

module.exports = { readAges };
if (require.main === module) {
  const entries = readAges(path.resolve(process.argv[2]), require(process.argv[3] || 'xlsx'));
  const target = path.join(__dirname, '../src/pages/Game/Life/engine/data/age.ts');
  fs.writeFileSync(target,
    "import type { Age } from './age.types';\n\n" +
    '// Generated from remake age.xlsx; repeated age rows must be merged.\n' +
    `const data = new Map<number, Age>(${JSON.stringify(entries, null, 2)});\nexport default data;\n`,
  );
  console.log(`Generated ${entries.length} age pools`);
}
