// Builds code.js for the "Sísí DS Sync" Figma plugin from the code's design system.
//   node tools/figma-sync/build.mjs
// Reads design-system/tokens.css, design-system/typography.css and
// components/ds/icons.tsx, and bakes them into plugin.js → code.js.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const tokensCss = read("design-system/tokens.css");
const typeCss = read("design-system/typography.css");
const iconsTsx = read("components/ds/icons.tsx");

// only the first :root block (the phone-width overrides come later)
const rootBlock = (css) => css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
const decls = (css) => {
  const out = {};
  for (const m of rootBlock(css).matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};
const T = decls(tokensCss);
const Y = decls(typeCss);

// colours: hex or rgba() only (legacy aliases are skipped)
const colors = [];
for (const [k, v] of Object.entries(T)) {
  let c = null;
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  const rgba = v.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (hex) { const n = parseInt(hex[1], 16); c = { r: (n >> 16) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 }; }
  else if (rgba) c = { r: +rgba[1] / 255, g: +rgba[2] / 255, b: +rgba[3] / 255, a: +rgba[4] };
  if (c) colors.push({ css: k, value: c });
}

const px = (v) => { const m = String(v).match(/^(-?[\d.]+)px$/); return m ? +m[1] : null; };
const sizes = [];
for (const [k, v] of Object.entries(T)) {
  if (/^(space-|icon-|screen-pad|touch-min|nav-height)/.test(k) && px(v) !== null) sizes.push({ css: k, value: px(v) });
}
const ms = [];
for (const [k, v] of Object.entries(T)) { const m = v.match(/^(\d+)ms$/); if (m) ms.push({ css: k, value: +m[1] }); }
const z = [];
for (const [k, v] of Object.entries(T)) if (k.startsWith("z-")) z.push({ css: k, value: +v });

// type sizes, as they read on a 390-wide phone (the mockup width)
const W = 390;
const evalSize = (v) => {
  const c = v.match(/clamp\(\s*([\d.]+)px,\s*([\d.]+)vw,\s*([\d.]+)px\)/);
  if (c) return Math.round(Math.min(+c[3], Math.max(+c[1], (+c[2] * W) / 100)) * 10) / 10;
  return px(v);
};
const textSizes = [];
for (const [k, v] of Object.entries(Y)) if (k.startsWith("text-")) textSizes.push({ css: k, value: evalSize(v), source: v });
const leading = {};
for (const [k, v] of Object.entries(Y)) if (k.startsWith("leading-")) leading[k.slice(8)] = +v;

// icons: one path each
const icons = {};
for (const m of iconsTsx.matchAll(/export const Icon(\w+) = \(p: IconProps\) => <Svg \{\.\.\.p\} d="([^"]+)"/g)) {
  const kebab = m[1].replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  icons[kebab] = m[2];
}
const glyph = iconsTsx.match(/export function StarGlyph[\s\S]*?<path d="([^"]+)"/);
if (glyph) icons["star-glyph"] = glyph[1];

const data = { builtAt: new Date().toISOString().slice(0, 10), colors, sizes, ms, z, textSizes, leading, icons };
const tpl = readFileSync(join(here, "plugin.js"), "utf8");
writeFileSync(join(here, "code.js"), tpl.replace("/*__DATA__*/ null", JSON.stringify(data)));
console.log(`code.js: ${colors.length} colours, ${sizes.length} sizes, ${textSizes.length} type sizes, ${ms.length} durations, ${z.length} layers, ${Object.keys(icons).length} icons`);
