// design-sync build step: the synthesized entry uses `export * from <file>`
// for every component file, which (per ES module semantics) never re-exports
// default exports. Real components are still `export default function X()`
// (function declarations create a local `X` binding), so we just add a
// trailing named re-export for each — no behavior change, additive only.
// Runs against the staged build-only copy in .design-sync/build-src/, never
// against the real components/sisi/ source.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2];
if (!ROOT) {
  console.error('usage: node fix-default-exports.mjs <dir>');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|jsx)$/.test(entry)) out.push(p);
  }
  return out;
}

let fixed = 0;
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8');
  const m = src.match(/export default function ([A-Za-z][A-Za-z0-9]*)/);
  if (!m) continue;
  const name = m[1];
  if (new RegExp(`export\\s*\\{[^}]*\\b${name}\\b`).test(src)) continue;
  writeFileSync(file, `${src}\nexport { ${name} };\n`);
  fixed++;
}
console.error(`[fix-default-exports] added named re-export to ${fixed} file(s) under ${ROOT}`);
