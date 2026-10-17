import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
require('./register.cjs');
const { scanAllergens } = require('../src/lib/allergenSynonyms.ts');
const directory = path.dirname(fileURLToPath(import.meta.url));
const raw = fs.readFileSync(path.join(directory, 'benchmark-dataset.json'));
const dataset = JSON.parse(raw.toString('utf8'));
const matrix = { truePositive: 0, trueNegative: 0, falsePositive: 0, falseNegative: 0 };
const results = dataset.map((item) => {
  const result = scanAllergens(item.recipeIngredients, item.userAllergy);
  matrix[
    result.hasRisk
      ? item.expectedRisk
        ? 'truePositive'
        : 'falsePositive'
      : item.expectedRisk
        ? 'falseNegative'
        : 'trueNegative'
  ]++;
  const passed =
    result.hasRisk === item.expectedRisk &&
    (!item.expectedKeyword || result.flags.some((flag) => flag.keyword === item.expectedKeyword));
  return {
    id: item.id,
    name: item.name,
    expectedRisk: item.expectedRisk,
    actualRisk: result.hasRisk,
    passed,
    flags: result.flags,
  };
});
const ratio = (a, b) => (b ? a / b : null);
const report = {
  datasetVersion: '2.0',
  datasetSha256: createHash('sha256').update(raw).digest('hex'),
  generatedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  matrix,
  precision: ratio(matrix.truePositive, matrix.truePositive + matrix.falsePositive),
  recall: ratio(matrix.truePositive, matrix.truePositive + matrix.falseNegative),
  limitation:
    'Curated synthetic regression cases, not an independent clinical or real-world safety evaluation. No model was called. Precision/recall apply only to this dataset.',
  results,
};
fs.mkdirSync(path.join(directory, '../test-results'), { recursive: true });
fs.writeFileSync(
  path.join(directory, '../test-results/benchmark.json'),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
for (const result of results.filter((r) => !r.passed)) console.error(JSON.stringify(result));
if (report.passed !== report.total) process.exitCode = 1;
