/**
 * ResQ Automated i18n Verification Script
 * Checks client/src for:
 * 1. Completeness of Telugu (te) and Hindi (hi) translations against English (en).
 * 2. Unregistered keys referenced by t('key') calls in application source files.
 * 3. Returns exit code 0 if all keys match with 0 missing, or 1 if any key is missing.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translations } from '../src/i18n/translations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function getLeafKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj || {})) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getLeafKeys(value, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

function getAllFiles(dir, exts = ['.jsx', '.js']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(file))) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('--- ResQ i18n Coverage Audit ---');

const enLeaves = getLeafKeys(translations.en);
const teLeaves = new Set(getLeafKeys(translations.te));
const hiLeaves = new Set(getLeafKeys(translations.hi));

const missingInTe = enLeaves.filter((k) => !teLeaves.has(k));
const missingInHi = enLeaves.filter((k) => !hiLeaves.has(k));

console.log(`Total English leaf keys defined: ${enLeaves.length}`);
console.log(`Telugu leaf keys defined: ${teLeaves.size}`);
console.log(`Hindi leaf keys defined: ${hiLeaves.size}`);

let errorsCount = 0;

if (missingInTe.length > 0) {
  console.error(`\n❌ Missing in Telugu (${missingInTe.length} keys):`);
  missingInTe.forEach((k) => console.error(`  - ${k}`));
  errorsCount += missingInTe.length;
} else {
  console.log('✅ Telugu (te) has 100% key parity with English.');
}

if (missingInHi.length > 0) {
  console.error(`\n❌ Missing in Hindi (${missingInHi.length} keys):`);
  missingInHi.forEach((k) => console.error(`  - ${k}`));
  errorsCount += missingInHi.length;
} else {
  console.log('✅ Hindi (hi) has 100% key parity with English.');
}

// Scan source files for t('...') calls
const srcFiles = getAllFiles(srcDir);
const tRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
const usedKeys = new Set();

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    usedKeys.add(match[1]);
  }
}

console.log(`\nFound ${usedKeys.size} distinct t('key') calls in client/src.`);

// The translation dictionary supports both full dot paths ("nav.home", "camera.capture")
// and flat/leaf lookups ("home", "open", "rescueComplete").
const validLookupSet = new Set(enLeaves);
for (const fullPath of enLeaves) {
  const parts = fullPath.split('.');
  if (parts.length > 1) {
    validLookupSet.add(parts[parts.length - 1]);
  }
}
// Also add top-level root keys
for (const k of Object.keys(translations.en)) {
  validLookupSet.add(k);
}

const missingUsedKeys = [];
for (const key of usedKeys) {
  if (!validLookupSet.has(key)) {
    missingUsedKeys.push(key);
  }
}

if (missingUsedKeys.length > 0) {
  console.error(`\n❌ The following keys are referenced via t() in code but missing from translations:`);
  missingUsedKeys.forEach((k) => console.error(`  - ${k}`));
  errorsCount += missingUsedKeys.length;
} else {
  console.log('✅ All t() calls in code exist in translation dictionary.');
}

if (errorsCount > 0) {
  console.error(`\n❌ i18n check FAILED with ${errorsCount} error(s).`);
  process.exit(1);
} else {
  console.log('\n🎉 i18n check PASSED cleanly! 0 missing keys.');
  process.exit(0);
}
