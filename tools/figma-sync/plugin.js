// Sísí DS Sync — brings the code's design system into the Sísí Design System Figma file.
// Template: build.mjs bakes the tokens and icons in below and writes code.js.
// Safe to run again: it updates what is there (by code name / layer name) and
// only adds what is missing. Nothing you drew yourself is deleted; the one
// frame it rebuilds each run is "Foundations / Code tokens (synced)".
const DATA = /*__DATA__*/ null;

const log = [];
const note = (s) => log.push(s);

// ── helpers ──────────────────────────────────────────────────────────────
const webOf = (v) => (v.codeSyntax && v.codeSyntax.WEB) || "";
const cssVar = (name) => "var(--" + name + ")";
const near = (a, b) => Math.abs(a - b) < 0.002;
const sameColor = (a, b) => a && b && near(a.r, b.r) && near(a.g, b.g) && near(a.b, b.b) && near(a.a === undefined ? 1 : a.a, b.a === undefined ? 1 : b.a);
const isAlias = (v) => v && typeof v === "object" && v.type === "VARIABLE_ALIAS";

let cols, allVars, byWeb;
async function loadVars() {
  cols = await figma.variables.getLocalVariableCollectionsAsync();
  allVars = await figma.variables.getLocalVariablesAsync();
  byWeb = {};
  // a semantic (Color) variable wins over a primitive with the same code name
  const rank = (v) => { const c = cols.find((x) => x.id === v.variableCollectionId); return c && c.name === "Primitives" ? 1 : 0; };
  for (const v of allVars.slice().sort((a, b) => rank(b) - rank(a))) if (webOf(v)) byWeb[webOf(v)] = v;
}
function collection(name) {
  let c = cols.find((x) => x.name === name);
  if (!c) { c = figma.variables.createVariableCollection(name); cols.push(c); note("new collection " + name); }
  return c;
}
const counts = { varNew: 0, varUpd: 0, varSame: 0, varAlias: 0 };
function upsert(colName, name, type, value, web, scopes) {
  let v = byWeb[web];
  if (!v) {
    const col = collection(colName);
    v = allVars.find((x) => x.variableCollectionId === col.id && x.name === name);
    if (!v) { v = figma.variables.createVariable(name, col, type); v.scopes = scopes; allVars.push(v); counts.varNew++; }
    v.setVariableCodeSyntax("WEB", web);
    byWeb[web] = v;
  }
  const col = cols.find((x) => x.id === v.variableCollectionId);
  const mode = col.modes[0].modeId;
  const cur = v.valuesByMode[mode];
  if (isAlias(cur)) { counts.varAlias++; return v; }
  const same = type === "COLOR" ? sameColor(cur, value) : cur === value;
  if (same) counts.varSame++;
  else { v.setValueForMode(mode, value); if (cur !== undefined) counts.varUpd++; }
  return v;
}
const V = (css) => byWeb[cssVar(css)];
async function byId(id) { try { return await figma.variables.getVariableByIdAsync("VariableID:" + id); } catch (e) { return null; } }

function paintOf(v, opacity) {
  let p = { type: "SOLID", color: { r: 0, g: 0, b: 0 } };
  if (v) p = figma.variables.setBoundVariableForPaint(p, "color", v);
  if (opacity !== undefined) p.opacity = opacity;
  return p;
}
const fill = (n, v, o) => { n.fills = [paintOf(v, o)]; };
const stroke = (n, v, w, o) => { n.strokes = [paintOf(v, o)]; n.strokeWeight = w || 1; n.strokeAlign = "INSIDE"; };
function bindNum(n, field, value, v) { n[field] = value; if (v) { try { n.setBoundVariable(field, v); } catch (e) {} } }
function spaceVar(val) {
  for (const s of DATA.sizes) if (s.css.startsWith("space-") && s.value === val) return V(s.css);
  return null;
}
function pad(n, t, r, b, l) {
  bindNum(n, "paddingTop", t, spaceVar(t)); bindNum(n, "paddingRight", r, spaceVar(r));
  bindNum(n, "paddingBottom", b, spaceVar(b)); bindNum(n, "paddingLeft", l, spaceVar(l));
}
const gap = (n, val) => bindNum(n, "itemSpacing", val, spaceVar(val));
function radius(n, val, v) {
  for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) bindNum(n, k, Array.isArray(val) ? val[["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"].indexOf(k)] : val, v);
}
function auto(dir, name) {
  const f = figma.createFrame();
  f.layoutMode = dir; f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO";
  f.name = name; f.fills = []; f.clipsContent = false;
  return f;
}
// fixed width, height follows the content (resize first: it resets sizing to FIXED)
function hugWidth(n, w) {
  n.resize(w, Math.max(1, n.height));
  if (n.layoutMode === "VERTICAL") { n.primaryAxisSizingMode = "AUTO"; n.counterAxisSizingMode = "FIXED"; }
  else { n.primaryAxisSizingMode = "FIXED"; n.counterAxisSizingMode = "AUTO"; }
}
async function loadTextFonts(t) {
  if (typeof t.fontName !== "symbol") { await figma.loadFontAsync(t.fontName); return; }
  for (const seg of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(seg.fontName);
}

// ── fonts ────────────────────────────────────────────────────────────────
let FONTS;
async function pickFonts() {
  const list = await figma.listAvailableFontsAsync();
  const has = (family, style) => list.some((f) => f.fontName.family === family && f.fontName.style === style);
  const first = (pairs) => { for (const p of pairs) if (has(p[0], p[1])) return { family: p[0], style: p[1] }; return null; };
  FONTS = {
    ed: first([["Sentient", "Light"], ["Newsreader", "Light"], ["Newsreader", "Regular"], ["Georgia", "Regular"]]) || { family: "Inter", style: "Light" },
    edItalic: first([["Sentient", "Light Italic"], ["Sentient", "LightItalic"], ["Newsreader", "Light Italic"], ["Newsreader", "Italic"], ["Georgia", "Italic"]]) || { family: "Inter", style: "Italic" },
    ui: { family: "Inter", style: "Regular" },
    uiMed: { family: "Inter", style: "Medium" },
    uiSemi: { family: "Inter", style: "Semi Bold" },
  };
  for (const f of Object.values(FONTS)) await figma.loadFontAsync(f);
  note("editorial font: " + FONTS.ed.family + " " + FONTS.ed.style + (FONTS.ed.family === "Sentient" ? "" : " (Sentient not installed — stand-in)"));
}

// ── 1 · variables ────────────────────────────────────────────────────────
async function syncVariables() {
  for (const c of DATA.colors) {
    const name = c.css.startsWith("sisi-") ? "core/" + c.css.slice(5) : c.css.replace(/^(ink|paper|blue|gold)-(\d+)$/, "$1/$2").replace(/^overlay-/, "overlay/");
    upsert("Primitives", name, "COLOR", c.value, cssVar(c.css), []);
  }
  for (const s of DATA.sizes) {
    const name = s.css.startsWith("space-") ? "space/" + s.css.slice(6) : s.css.startsWith("icon-") ? "icon/" + s.css.slice(5) : "size/" + s.css;
    const scopes = s.css.startsWith("space-") ? ["GAP", "WIDTH_HEIGHT"] : ["WIDTH_HEIGHT"];
    upsert("Layout", name, "FLOAT", s.value, cssVar(s.css), scopes);
  }
  for (const t of DATA.textSizes) upsert("Type", "size/" + t.css.slice(5), "FLOAT", t.value, cssVar(t.css), ["FONT_SIZE"]);
  for (const m of DATA.ms) upsert("Motion", "duration/" + m.css.replace(/^motion-/, ""), "FLOAT", m.value, cssVar(m.css), []);
  for (const z of DATA.z) upsert("Motion", "layer/" + z.css.slice(2), "FLOAT", z.value, cssVar(z.css), []);
  note(`variables: ${counts.varNew} new · ${counts.varUpd} updated · ${counts.varSame} already right · ${counts.varAlias} semantic (kept)`);
}

// ── 2 · text + effect styles ─────────────────────────────────────────────
let TS = {}, ES = {};
async function syncStyles() {
  const size = (k) => { const t = DATA.textSizes.find((x) => x.css === "text-" + k); return t ? t.value : 16; };
  const L = DATA.leading;
  const ed = FONTS.ed, it = FONTS.edItalic;
  const specs = [
    ["editorial/display", ed, "display", L.display, -3, "t-display"],
    ["editorial/screen-title", ed, "screen-title", L.title, -3, "t-screen-title · the one title at the top of a screen"],
    ["editorial/card-title", ed, "card-title", L.title, -3, "t-card-title · sheet, dialog and card titles"],
    ["editorial/wish", ed, "wish", L.title, -3, "--text-wish · a wish under its Star"],
    ["editorial/paper-title", ed, "paper-title", L.title, -3, "--text-paper-title · the question on a writing paper"],
    ["editorial/dialogue", ed, "dialogue", L.dialogue, -3, "t-dialogue"],
    ["editorial/speech", ed, "speech", L.dialogue, -3, "--text-speech · Sísí's voice in bubbles"],
    ["editorial/body", ed, "body", L.body, -3, "t-body"],
    ["editorial/affirmation", it, "dialogue", L.dialogue, -3, "t-affirmation"],
    ["editorial/status", it, "body", 1.2, -3, ".ds-status · a quiet italic status (Still walking)"],
    ["editorial/button", ed, "button", 1.1, -3, ".ds-btn · button labels"],
    ["ui/meta", FONTS.ui, "meta", L.meta, 1, "t-meta · dates, helpers"],
    ["ui/label", FONTS.uiMed, "meta", L.meta, 2, ".ds-label / .ds-kicker · field labels, “Connected to”"],
    ["ui/status", FONTS.uiMed, "chip", 1, 2, "t-status · chips"],
    ["ui/sky-chip", FONTS.uiSemi, null, 1, 0, ".ds-filter.ds-on-sky / .ds-seg-item · 13 / 600"],
    ["ui/helper", FONTS.ui, "helper", L.meta, 0.5, "t-helper"],
  ];
  const existing = await figma.getLocalTextStylesAsync();
  for (const s of existing) await figma.loadFontAsync(s.fontName);
  let made = 0, upd = 0;
  for (const [name, font, key, lh, track, desc] of specs) {
    let st = existing.find((x) => x.name === name);
    if (!st) { st = figma.createTextStyle(); st.name = name; made++; } else upd++;
    st.fontName = font;
    st.fontSize = key ? size(key) : 13;
    st.lineHeight = { unit: "PERCENT", value: Math.round(lh * 100) };
    st.letterSpacing = { unit: "PERCENT", value: track };
    st.description = desc;
    const v = key ? V("text-" + key) : null;
    if (v) { try { st.setBoundVariable("fontSize", v); } catch (e) {} }
    TS[name] = st;
  }
  note(`text styles: ${made} new · ${upd} updated (sizes as on a 390-wide phone)`);

  const ink = { r: 16 / 255, g: 45 / 255, b: 50 / 255 };
  const sh = (y, r, a) => ({ type: "DROP_SHADOW", color: { r: ink.r, g: ink.g, b: ink.b, a }, offset: { x: 0, y }, radius: r, spread: 0, visible: true, blendMode: "NORMAL" });
  const effects = [
    ["shadow/paper", [sh(2, 6, 0.1), sh(10, 24, 0.06)], "--paper-shadow · dialogs"],
    ["shadow/paper-soft", [sh(2, 5, 0.09)], "--paper-shadow-soft · filled icon buttons"],
    ["shadow/note", [sh(2, 3, 0.1), sh(6, 12, 0.07)], ".ds-note / .ds-menu-list · bubbles, toasts, menus"],
    ["shadow/memory", [sh(2, 3, 0.1), sh(8, 18, 0.07)], ".ds-memory · Moments cards"],
    ["shadow/sheet", [sh(-6, 30, 0.16)], ".ds-focus · the paper that rises from the bottom"],
  ];
  const ex = await figma.getLocalEffectStylesAsync();
  for (const [name, eff, desc] of effects) {
    let st = ex.find((x) => x.name === name);
    if (!st) { st = figma.createEffectStyle(); st.name = name; }
    st.effects = eff; st.description = desc; ES[name] = st;
  }
  note("effect styles: " + effects.length + " (paper, note, memory, sheet shadows)");
}

// ── 3 · icons ────────────────────────────────────────────────────────────
let ICONS = {};
async function syncIcons(page, C) {
  await figma.setCurrentPageAsync(page);
  const comps = page.findAllWithCriteria({ types: ["COMPONENT"] }).filter((c) => c.name.indexOf("icon/") === 0);
  const byName = {};
  for (const c of comps) byName[c.name.slice(5)] = c;
  const tplCell = page.findOne((n) => n.type === "FRAME" && n.name === "Cell / close");
  const grid = tplCell ? tplCell.parent : null;
  const tplLabel = tplCell ? tplCell.findOne((n) => n.type === "TEXT") : null;
  if (tplLabel) await figma.loadFontAsync(tplLabel.fontName);
  let upd = 0;
  const made = [];
  for (const name of Object.keys(DATA.icons)) {
    const gold = name === "star-glyph";
    const paths = [].concat(DATA.icons[name]);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' + paths.map((d) => '<path d="' + d + '" fill="#102D32"/>').join("") + '</svg>';
    const node = figma.createNodeFromSvg(svg);
    const v = gold ? C.gold : C.icon;
    let comp = byName[name];
    if (comp) {
      for (const ch of comp.children.slice()) ch.remove();
      for (const ch of node.children.slice()) comp.appendChild(ch);
      node.remove();
      upd++;
    } else {
      node.fills = [];
      comp = figma.createComponentFromNode(node);
      comp.name = "icon/" + name;
      comp.description = "components/ds/icons.tsx · crayon mark, filled; colour = icon/default" + (gold ? " (gold: Stars only)" : "");
      if (grid && tplCell) {
        const cell = figma.createFrame();
        cell.name = "Cell / " + name;
        cell.layoutMode = tplCell.layoutMode; cell.itemSpacing = tplCell.itemSpacing;
        cell.primaryAxisAlignItems = tplCell.primaryAxisAlignItems; cell.counterAxisAlignItems = tplCell.counterAxisAlignItems;
        cell.paddingTop = tplCell.paddingTop; cell.paddingBottom = tplCell.paddingBottom; cell.paddingLeft = tplCell.paddingLeft; cell.paddingRight = tplCell.paddingRight;
        cell.resize(tplCell.width, tplCell.height);
        cell.primaryAxisSizingMode = "AUTO";
        cell.fills = JSON.parse(JSON.stringify(tplCell.fills)); cell.strokes = JSON.parse(JSON.stringify(tplCell.strokes)); cell.cornerRadius = tplCell.cornerRadius;
        grid.appendChild(cell);
        cell.appendChild(comp);
        if (tplLabel) { const t = tplLabel.clone(); t.characters = name; cell.appendChild(t); }
      } else {
        page.appendChild(comp);
      }
      made.push(name);
    }
    comp.fills = [];
    // star-glyph: gold fill, then the deeper-gold outline on top
    const tones = gold ? [C.gold, C.goldDeep || C.gold] : [v];
    let i = 0;
    for (const n of comp.findAll((x) => "fills" in x)) if (Array.isArray(n.fills) && n.fills.length) fill(n, tones[Math.min(i++, tones.length - 1)]);
    ICONS[name] = comp;
  }
  for (const c of comps) if (!ICONS[c.name.slice(5)]) ICONS[c.name.slice(5)] = c;
  note(`icons: ${upd} redrawn from code` + (made.length ? ` · ${made.length} new (${made.join(", ")})` : ""));
}

// ── 4 · components ───────────────────────────────────────────────────────
async function text(str, styleName, v, opacity) {
  const t = figma.createText();
  const st = TS[styleName];
  if (st) { await figma.loadFontAsync(st.fontName); await t.setTextStyleIdAsync(st.id); }
  t.characters = str;
  if (v !== undefined) fill(t, v, opacity);
  return t;
}
function iconInst(name, size, v, opacity) {
  const c = ICONS[name];
  if (!c) return null;
  const i = c.createInstance();
  i.resize(size, size);
  if (v) for (const n of i.findAll((x) => "fills" in x)) if (Array.isArray(n.fills) && n.fills.length) fill(n, v, opacity);
  return i;
}
const propKey = (owner, prefix) => Object.keys(owner.componentPropertyDefinitions).find((k) => k.indexOf(prefix) === 0);
function layoutSet(set, cols) {
  set.layoutMode = "HORIZONTAL"; set.layoutWrap = "WRAP"; set.itemSpacing = 24; set.counterAxisSpacing = 24;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24;
  set.fills = []; set.strokes = [{ type: "SOLID", color: { r: 0.6, g: 0.55, b: 0.85 } }]; set.dashPattern = [4, 4]; set.cornerRadius = 16;
  const w = set.children.slice(0, cols).reduce((a, c) => a + c.width, 0) + 24 * (cols - 1) + 48;
  hugWidth(set, w);
}

async function restyleStatusChip(page, C) {
  const set = page.findOne((n) => n.type === "COMPONENT_SET" && n.name === "StatusChip");
  if (!set) return;
  for (const v of set.children) {
    const dark = v.name.indexOf("Surface=Dark") >= 0;
    const star = v.name.indexOf("Tone=Star") >= 0;
    const fg = dark ? C.paper : C.ink;
    const fgO = dark ? 0.8 : 0.6;
    v.fills = []; v.strokes = [];
    pad(v, 0, 0, 0, 0); gap(v, 6);
    const t = v.findOne((n) => n.type === "TEXT");
    if (t) { await loadTextFonts(t); await t.setTextStyleIdAsync(TS["editorial/status"].id); fill(t, fg, fgO); }
    const dot = v.findOne((n) => n.type === "ELLIPSE");
    const hasGlyph = v.findOne((n) => n.type === "INSTANCE" && n.name === "icon/star-glyph");
    if (star) {
      if (dot) dot.remove();
      if (!hasGlyph) { const g = iconInst("star-glyph", 14); if (g) v.insertChild(0, g); }
    } else if (dot) { dot.resize(5, 5); fill(dot, fg, 0.7 * fgO + 0.3); }
  }
  set.description = ".ds-status — a small mark, not a pill: a dot (or the gold star for Star states) + italic words. Informative, not tappable.";
  note("StatusChip restyled to the current code (italic words, no pill)");
}

async function buildComponents(page, C) {
  await figma.setCurrentPageAsync(page);
  await restyleStatusChip(page, C);
  const exists = (name) => page.findOne((n) => (n.type === "COMPONENT_SET" || n.type === "COMPONENT") && n.name === name);
  const findSet = (name) => page.findOne((n) => n.type === "COMPONENT_SET" && n.name === name);

  const HOST = "Components / Sheets, Menus & Paper (synced)";
  let host = page.findOne((n) => n.type === "FRAME" && n.name === HOST && n.parent === page);
  if (!host) {
    host = auto("VERTICAL", HOST);
    const right = page.children.reduce((m, n) => Math.max(m, n.x + n.width), 0);
    host.x = right + 160; host.y = 0;
    gap(host, 48); pad(host, 64, 64, 64, 64); fill(host, C.paper);
    page.appendChild(host);
  }
  const block = async (title, desc) => {
    const b = auto("VERTICAL", "Block / " + title); gap(b, 16); host.appendChild(b);
    b.appendChild(await text(title, "editorial/card-title", C.ink));
    b.appendChild(await text(desc, "ui/meta", C.ink, 0.6));
    const row = auto("HORIZONTAL", "Row"); gap(row, 24); row.counterAxisAlignItems = "MIN"; b.appendChild(row);
    return row;
  };
  const made = [], skipped = [];
  const btnSet = findSet("Button"), iconBtnSet = findSet("IconButton");
  const variant = (set, name) => (set ? set.children.find((c) => c.name === name) : null);
  const tv0 = variant(btnSet, "Variant=Text, Surface=Paper, State=Default"), lk0 = btnSet ? propKey(btnSet, "Label") : null;

  // MenuItem + OverflowMenu
  let menuItemSet = findSet("MenuItem");
  if (!menuItemSet) {
    const row = await block("menu", ".ds-menu-list / .ds-menu-item — the three-dot menu, the only home of destructive actions. Deckled note paper (edges approximated as a soft rounded sheet here).");
    const items = [];
    for (const kind of ["Default", "Destructive"]) {
      const c = figma.createComponent(); c.name = "Kind=" + kind;
      c.layoutMode = "HORIZONTAL"; c.counterAxisAlignItems = "CENTER"; gap(c, 8); pad(c, 0, 12, 0, 12);
      c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED"; c.resize(192, 44); c.cornerRadius = 8; c.fills = [];
      const fg = kind === "Destructive" ? C.coral : C.ink;
      const ic = iconInst(kind === "Destructive" ? "trash" : "pencil", 20, fg); if (ic) c.appendChild(ic);
      c.appendChild(await text(kind === "Destructive" ? "Let it go" : "Edit", "editorial/body", fg));
      items.push(c);
    }
    menuItemSet = figma.combineAsVariants(items, row); menuItemSet.name = "MenuItem";
    menuItemSet.addComponentProperty("Label", "TEXT", "Edit");
    if (ICONS.pencil) menuItemSet.addComponentProperty("Icon", "INSTANCE_SWAP", ICONS.pencil.id);
    menuItemSet.addComponentProperty("Show icon", "BOOLEAN", true);
    for (const v of menuItemSet.children) {
      const t = v.findOne((n) => n.type === "TEXT"); t.componentPropertyReferences = { characters: propKey(menuItemSet, "Label") };
      const i = v.findOne((n) => n.type === "INSTANCE");
      if (i) i.componentPropertyReferences = Object.assign({ visible: propKey(menuItemSet, "Show icon") }, propKey(menuItemSet, "Icon") && v.name === "Kind=Default" ? { mainComponent: propKey(menuItemSet, "Icon") } : {});
    }
    layoutSet(menuItemSet, 2);
    menuItemSet.description = "A menu row (.ds-menu-item). Destructive rows are coral and open a ConfirmationDialog.";
    made.push("MenuItem");

    const m = figma.createComponent(); m.name = "OverflowMenu";
    m.layoutMode = "VERTICAL"; pad(m, 4, 4, 4, 4); gap(m, 0); m.primaryAxisSizingMode = "AUTO"; m.counterAxisSizingMode = "AUTO";
    fill(m, C.paper); radius(m, 16, C.rMenu);
    await m.setEffectStyleIdAsync(ES["shadow/note"].id);
    const lk = propKey(menuItemSet, "Label"), ik = propKey(menuItemSet, "Icon");
    const rows = [["Edit", "pencil", "Default"], ["Share", "share", "Default"], ["Let it go", null, "Destructive"]];
    for (const [label, icon, kind] of rows) {
      const inst = variant(menuItemSet, "Kind=" + kind).createInstance();
      const props = {}; props[lk] = label; if (icon && ik && ICONS[icon]) props[ik] = ICONS[icon].id;
      inst.setProperties(props); m.appendChild(inst);
    }
    m.description = "The three-dot menu (OverflowMenu). Swap rows; keep destructive last.";
    row.appendChild(m); made.push("OverflowMenu");
  } else skipped.push("MenuItem");

  // TextField
  if (!exists("TextField")) {
    const row = await block("text field", ".ds-field — a hand-drawn box (here a 1px line): soft at rest, bold ink while writing. 16px type so iOS never zooms. Label = .ds-label.");
    const vs = [];
    for (const surface of ["Paper", "Dark"]) for (const state of ["Resting", "Writing"]) {
      const dark = surface === "Dark";
      const c = figma.createComponent(); c.name = "State=" + state + ", Surface=" + surface;
      c.layoutMode = "VERTICAL"; gap(c, 8); hugWidth(c, 320);
      if (dark) { fill(c, C.ink); pad(c, 16, 16, 16, 16); c.cornerRadius = 12; } else { c.fills = []; pad(c, 0, 0, 0, 0); }
      c.appendChild(await text("What are you wishing for?", "ui/label", dark ? C.paper : C.ink, dark ? 0.6 : 0.6));
      const box = auto("HORIZONTAL", "Field"); pad(box, 12, 16, 12, 16); box.cornerRadius = 14;
      c.appendChild(box); box.layoutSizingHorizontal = "FILL"; box.minHeight = 48;
      stroke(box, dark ? C.paper : C.ink, state === "Writing" ? 1.6 : 1, state === "Writing" ? 1 : 0.35);
      const t = await text(state === "Writing" ? "My days feel calm" : "Write it in your words", "editorial/body", dark ? C.paper : C.ink, state === "Writing" ? 1 : 0.35);
      t.fontSize = 16; box.appendChild(t); t.layoutSizingHorizontal = "FILL";
      vs.push(c);
    }
    const set = figma.combineAsVariants(vs, row); set.name = "TextField";
    set.addComponentProperty("Label", "TEXT", "What are you wishing for?");
    set.addComponentProperty("Text", "TEXT", "Write it in your words");
    for (const v of set.children) {
      const ts = v.findAll((n) => n.type === "TEXT");
      ts[0].componentPropertyReferences = { characters: propKey(set, "Label") };
      ts[1].componentPropertyReferences = { characters: propKey(set, "Text") };
    }
    layoutSet(set, 2); set.description = "Form field (.ds-field) with its label. Placeholder = ink 35%.";
    made.push("TextField");
  } else skipped.push("TextField");

  // StarConnectionRow
  if (!exists("StarConnectionRow")) {
    const row = await block("star connection row", ".ds-star-row — Connected to ✦ Star · status ›. Box (tappable), Plain (information with a way through), Choice (picking a Star; the picked one gets the bold box and a tick).");
    const vs = [];
    for (const style of ["Box", "Plain", "Choice"]) {
      const c = figma.createComponent(); c.name = "Style=" + style;
      c.layoutMode = "VERTICAL"; gap(c, 8); hugWidth(c, 330); c.fills = [];
      const kick = await text("Connected to", "ui/label", C.ink, 0.6); c.appendChild(kick);
      const r = auto("HORIZONTAL", "Row"); r.counterAxisAlignItems = "CENTER"; gap(r, 12);
      c.appendChild(r); r.layoutSizingHorizontal = "FILL";
      if (style === "Plain") { pad(r, 4, 8, 4, 8); r.minHeight = 48; }
      else { pad(r, 8, 12, 8, 12); r.minHeight = style === "Choice" ? 52 : 56; r.cornerRadius = 14; stroke(r, C.ink, style === "Choice" ? 1.6 : 1); }
      const g = iconInst("star-glyph", 18); if (g) r.appendChild(g);
      const main = auto("VERTICAL", "Main"); gap(main, 4); r.appendChild(main); main.layoutSizingHorizontal = "FILL";
      const title = await text("My days feel calm.", "editorial/body", C.ink); main.appendChild(title);
      main.appendChild(await text("Still walking", "ui/meta", C.ink, 0.6));
      const end = iconInst(style === "Choice" ? "check" : "chevron-right", 20, C.ink, style === "Plain" ? 0.6 : 1); if (end) r.appendChild(end);
      vs.push(c);
    }
    const set = figma.combineAsVariants(vs, row); set.name = "StarConnectionRow";
    set.addComponentProperty("Star", "TEXT", "My days feel calm.");
    set.addComponentProperty("Status", "TEXT", "Still walking");
    set.addComponentProperty("Show label", "BOOLEAN", true);
    for (const v of set.children) {
      const ts = v.findAll((n) => n.type === "TEXT");
      ts[0].componentPropertyReferences = { visible: propKey(set, "Show label") };
      ts[1].componentPropertyReferences = { characters: propKey(set, "Star") };
      ts[2].componentPropertyReferences = { characters: propKey(set, "Status") };
    }
    layoutSet(set, 3); set.description = "StarConnectionRow (components/ds/chips.tsx). The hand-drawn box is a 1px line here.";
    made.push("StarConnectionRow");
  } else skipped.push("StarConnectionRow");

  // MemoryPaper
  if (!exists("MemoryPaper")) {
    const row = await block("memory paper", ".ds-memory — a Moment on paper: softly torn top and bottom edges (straight here), meta · title · words · photo. Compact = 16 padding.");
    const vs = [];
    for (const size of ["Regular", "Compact"]) for (const img of ["false", "true"]) {
      const c = figma.createComponent(); c.name = "Size=" + size + ", Image=" + img;
      c.layoutMode = "VERTICAL"; const p = size === "Compact" ? 16 : 20; pad(c, p, p, p, p); gap(c, 8);
      hugWidth(c, 350);
      fill(c, C.paper); c.cornerRadius = 3;
      await c.setEffectStyleIdAsync(ES["shadow/memory"].id);
      c.appendChild(await text("Nov 12 · quiet meadow", "ui/meta", C.ink, 0.6));
      const title = await text("The sky looked painted today", "editorial/card-title", C.ink); c.appendChild(title); title.layoutSizingHorizontal = "FILL";
      const words = await text("Coffee with a friend, and the long way home.", "editorial/body", C.ink); c.appendChild(words); words.layoutSizingHorizontal = "FILL";
      if (img === "true") {
        const r = figma.createRectangle(); r.name = "Photo"; r.resize(350 - 2 * p, 190); r.cornerRadius = 2; fill(r, C.blue, 0.35);
        c.appendChild(r); r.layoutSizingHorizontal = "FILL";
      }
      vs.push(c);
    }
    const set = figma.combineAsVariants(vs, row); set.name = "MemoryPaper";
    set.addComponentProperty("Meta", "TEXT", "Nov 12 · quiet meadow");
    set.addComponentProperty("Title", "TEXT", "The sky looked painted today");
    set.addComponentProperty("Text", "TEXT", "Coffee with a friend, and the long way home.");
    set.addComponentProperty("Show title", "BOOLEAN", true);
    for (const v of set.children) {
      const ts = v.findAll((n) => n.type === "TEXT");
      ts[0].componentPropertyReferences = { characters: propKey(set, "Meta") };
      ts[1].componentPropertyReferences = { characters: propKey(set, "Title"), visible: propKey(set, "Show title") };
      ts[2].componentPropertyReferences = { characters: propKey(set, "Text") };
    }
    layoutSet(set, 2); set.description = "MemoryPaper (components/ds/paper.tsx). Memory grain ~6% in code; flat Sísí Paper here.";
    made.push("MemoryPaper");
  } else skipped.push("MemoryPaper");

  // ConfirmationDialog
  if (!exists("ConfirmationDialog")) {
    const row = await block("dialog", ".ds-dialog — a centred paper card over a dim backdrop. One action is a shape (Primary); the way out is words (Text action).");
    const c = figma.createComponent(); c.name = "ConfirmationDialog";
    c.layoutMode = "VERTICAL"; hugWidth(c, 358);
    fill(c, C.paper); radius(c, [15, 13, 12, 17]);
    await c.setEffectStyleIdAsync(ES["shadow/paper"].id);
    const head = auto("HORIZONTAL", "Head"); pad(head, 22, 8, 0, 20); head.minHeight = 52; c.appendChild(head); head.layoutSizingHorizontal = "FILL";
    const title = await text("Let this Moment go?", "editorial/card-title", C.ink); head.appendChild(title); title.layoutSizingHorizontal = "FILL";
    const body = auto("VERTICAL", "Body"); pad(body, 8, 24, 20, 24); c.appendChild(body); body.layoutSizingHorizontal = "FILL";
    const msg = await text("It will leave your trail. This cannot be undone.", "editorial/body", C.ink, 0.8); body.appendChild(msg); msg.layoutSizingHorizontal = "FILL";
    const foot = auto("VERTICAL", "Actions"); pad(foot, 0, 24, 24, 24); gap(foot, 12); foot.counterAxisAlignItems = "CENTER"; c.appendChild(foot); foot.layoutSizingHorizontal = "FILL";
    const pv = variant(btnSet, "Variant=Primary, Surface=Paper, State=Default");
    const tv = variant(btnSet, "Variant=Text, Surface=Paper, State=Default");
    const lk = btnSet ? propKey(btnSet, "Label") : null;
    if (pv) { const b = pv.createInstance(); if (lk) b.setProperties({ [lk]: "Let it go" }); foot.appendChild(b); b.layoutSizingHorizontal = "FILL"; }
    if (tv) { const b = tv.createInstance(); if (lk) b.setProperties({ [lk]: "Keep it" }); foot.appendChild(b); }
    c.addComponentProperty("Title", "TEXT", "Let this Moment go?");
    c.addComponentProperty("Message", "TEXT", "It will leave your trail. This cannot be undone.");
    title.componentPropertyReferences = { characters: propKey(c, "Title") };
    msg.componentPropertyReferences = { characters: propKey(c, "Message") };
    c.description = "ConfirmationDialog (components/ds/modal.tsx). Paper radius 15/13/17/12, --paper-shadow.";
    row.appendChild(c);
    const bd = figma.createComponent(); bd.name = "ModalBackdrop"; bd.resize(390, 844); fill(bd, C.ink, 0.38);
    bd.description = ".ds-backdrop — ink 38% + 3px blur over the world. Put a dialog or sheet on top.";
    row.appendChild(bd);
    made.push("ConfirmationDialog", "ModalBackdrop");
  } else skipped.push("ConfirmationDialog");

  // FocusPaper
  if (!exists("FocusPaper")) {
    const row = await block("focus paper (sheet)", ".ds-focus — the paper that rises from the bottom: grip, title + ✕ on one 24px gutter, body, optional footer above a hairline.");
    const c = figma.createComponent(); c.name = "FocusPaper";
    c.layoutMode = "VERTICAL"; hugWidth(c, 390);
    fill(c, C.paper); radius(c, [20, 18, 0, 0]);
    await c.setEffectStyleIdAsync(ES["shadow/sheet"].id);
    const grip = figma.createRectangle(); grip.name = "Grip"; grip.resize(36, 4); grip.cornerRadius = 2; fill(grip, C.ink, 0.14);
    c.appendChild(grip); grip.layoutPositioning = "ABSOLUTE"; grip.x = 177; grip.y = 10;
    const head = auto("HORIZONTAL", "Head"); head.counterAxisAlignItems = "CENTER"; gap(head, 8); pad(head, 24, 12, 0, 24); head.minHeight = 52;
    c.appendChild(head); head.layoutSizingHorizontal = "FILL";
    const title = await text("Your stars", "editorial/card-title", C.ink); head.appendChild(title); title.layoutSizingHorizontal = "FILL";
    const cv = variant(iconBtnSet, "Style=Plain, Surface=Paper");
    if (cv) { const x = cv.createInstance(); const ik = propKey(iconBtnSet, "Icon"); if (ik && ICONS.close) x.setProperties({ [ik]: ICONS.close.id }); head.appendChild(x); }
    const body = auto("VERTICAL", "Body"); pad(body, 16, 24, 20, 24); gap(body, 12); c.appendChild(body); body.layoutSizingHorizontal = "FILL";
    const slot = auto("VERTICAL", "Content"); slot.minHeight = 160; slot.cornerRadius = 8; slot.strokes = [{ type: "SOLID", color: { r: 0.6, g: 0.55, b: 0.85 } }]; slot.dashPattern = [4, 4];
    slot.primaryAxisAlignItems = "CENTER"; slot.counterAxisAlignItems = "CENTER";
    body.appendChild(slot); slot.layoutSizingHorizontal = "FILL";
    slot.appendChild(await text("content — swap me", "ui/meta", C.ink, 0.6));
    const foot = auto("VERTICAL", "Footer"); pad(foot, 12, 24, 16, 24); c.appendChild(foot); foot.layoutSizingHorizontal = "FILL";
    foot.strokes = [paintOf(C.ink, 0.08)]; foot.strokeTopWeight = 1; foot.strokeBottomWeight = 0; foot.strokeLeftWeight = 0; foot.strokeRightWeight = 0;
    const pv = variant(btnSet, "Variant=Primary, Surface=Paper, State=Default");
    if (pv) { const b = pv.createInstance(); const lk = propKey(btnSet, "Label"); if (lk) b.setProperties({ [lk]: "Keep this in Moments" }); foot.appendChild(b); b.layoutSizingHorizontal = "FILL"; }
    c.addComponentProperty("Title", "TEXT", "Your stars");
    c.addComponentProperty("Show footer", "BOOLEAN", true);
    title.componentPropertyReferences = { characters: propKey(c, "Title") };
    foot.componentPropertyReferences = { visible: propKey(c, "Show footer") };
    c.description = "FocusPaper (components/ds/paper.tsx). Max 78% of the screen; the keyboard pushes it up. Focus grain ~4% in code.";
    row.appendChild(c); made.push("FocusPaper");
  } else skipped.push("FocusPaper");

  // ── Talk with Sísí (CompanionSheet) ──
  const blue20 = V("blue-20"), ink08 = V("ink-08");
  const bubbleFill = (n) => (blue20 ? fill(n, blue20) : fill(n, C.blue, 0.2));
  const sendButton = (dim) => {
    const b = auto("HORIZONTAL", "Send"); b.resize(44, 44); b.primaryAxisSizingMode = "FIXED"; b.counterAxisSizingMode = "FIXED";
    b.primaryAxisAlignItems = "CENTER"; b.counterAxisAlignItems = "CENTER"; b.cornerRadius = 999; fill(b, C.ink);
    const i = iconInst("send", 20, C.paper); if (i) b.appendChild(i);
    if (dim) b.opacity = 0.45;
    return b;
  };

  if (!exists("ChatInput")) {
    const row = await block("chat input", "CompanionSheet footer (.cs-input-row) — a round hand-drawn field (\"Share anything…\") and the ink Send button. Send is dim until there are words, and while Sísí is answering.");
    const vs = [];
    for (const state of ["Empty", "Typing", "Sending"]) {
      const c = figma.createComponent(); c.name = "State=" + state;
      c.layoutMode = "HORIZONTAL"; c.counterAxisAlignItems = "CENTER"; gap(c, 8); hugWidth(c, 342); c.fills = [];
      const box = auto("HORIZONTAL", "Field"); box.counterAxisAlignItems = "CENTER"; pad(box, 12, 18, 12, 18); box.cornerRadius = 999; box.minHeight = 48;
      c.appendChild(box); box.layoutSizingHorizontal = "FILL";
      stroke(box, C.ink, state === "Typing" ? 1.6 : 1, state === "Typing" ? 1 : 0.35);
      const typed = state === "Typing";
      const t = await text(typed ? "I keep thinking about the move" : "Share anything…", "editorial/body", C.ink, typed ? 1 : 0.35);
      t.fontSize = 16; box.appendChild(t); t.layoutSizingHorizontal = "FILL";
      if (state === "Sending") box.opacity = 0.6;
      c.appendChild(sendButton(state !== "Typing"));
      vs.push(c);
    }
    const set = figma.combineAsVariants(vs, row); set.name = "ChatInput";
    set.addComponentProperty("Text", "TEXT", "Share anything…");
    for (const v of set.children) v.findOne((n) => n.type === "TEXT").componentPropertyReferences = { characters: propKey(set, "Text") };
    layoutSet(set, 1); set.description = "Chat input (components/sisi/journey-v2/CompanionSheet.tsx · .cs-input-row). Field = .ds-field with radius 999, padding 0 18; Send = IconButton on ink.";
    made.push("ChatInput");
  } else skipped.push("ChatInput");

  if (!exists("ChatMessage")) {
    const row = await block("chat messages", "Sísí speaks in the editorial voice straight onto the paper (.cs-sisi, left, max 92%). Your words are a soft blue note on the right (.cs-user, radius 14 14 4 14). Kept = a small centred line with a tick (.cs-saved).");
    const vs = [];
    for (const from of ["Sísí", "You", "Kept"]) {
      const c = figma.createComponent(); c.name = "From=" + from;
      c.layoutMode = "VERTICAL"; hugWidth(c, 342); c.fills = [];
      if (from === "Sísí") {
        c.counterAxisAlignItems = "MIN";
        const t = await text("That sounds like a lot to carry. What part of it feels heaviest today?", "editorial/dialogue", C.ink);
        t.resize(315, t.height); t.textAutoResize = "HEIGHT"; c.appendChild(t);
      } else if (from === "You") {
        c.counterAxisAlignItems = "MAX";
        const b = auto("HORIZONTAL", "Note"); pad(b, 10, 14, 10, 14); radius(b, [14, 14, 14, 4]); bubbleFill(b);
        c.appendChild(b);
        const t = await text("I keep thinking about the move", "editorial/body", C.ink);
        b.appendChild(t);
      } else {
        c.counterAxisAlignItems = "CENTER";
        const r = auto("HORIZONTAL", "Kept"); r.counterAxisAlignItems = "CENTER"; gap(r, 8); c.appendChild(r);
        const i = iconInst("check", 16, C.ink, 0.8); if (i) r.appendChild(i);
        r.appendChild(await text("Kept in Moments", "ui/meta", C.ink, 0.8));
      }
      vs.push(c);
    }
    const set = figma.combineAsVariants(vs, row); set.name = "ChatMessage";
    set.addComponentProperty("Text", "TEXT", "That sounds like a lot to carry. What part of it feels heaviest today?");
    for (const v of set.children) { const t = v.findOne((n) => n.type === "TEXT"); if (t) t.componentPropertyReferences = { characters: propKey(set, "Text") }; }
    layoutSet(set, 1); set.description = "One line of the talk (CompanionSheet .cs-thread). Tap your own note → a 'Keep this as a moment' text action appears under it.";
    made.push("ChatMessage");
  } else skipped.push("ChatMessage");

  if (!exists("ChatSuggestion")) {
    const row = await block("chat suggestion", "Only Sísí's newest note carries a choice (.cs-suggest): one Primary, at most one Text action, and the lock line when something could be kept. Otherwise quick replies = ReplyChip.");
    const c = figma.createComponent(); c.name = "ChatSuggestion";
    c.layoutMode = "HORIZONTAL"; c.layoutWrap = "WRAP"; c.counterAxisAlignItems = "CENTER"; gap(c, 12); c.counterAxisSpacing = 8; hugWidth(c, 342); c.fills = [];
    const pv = variant(btnSet, "Variant=Primary, Surface=Paper, State=Default");
    const tv = variant(btnSet, "Variant=Text, Surface=Paper, State=Default");
    const lk = btnSet ? propKey(btnSet, "Label") : null;
    if (pv) { const b = pv.createInstance(); if (lk) b.setProperties({ [lk]: "Keep this in Moments" }); c.appendChild(b); }
    if (tv) { const b = tv.createInstance(); if (lk) b.setProperties({ [lk]: "Add to a Star" }); c.appendChild(b); }
    const lock = auto("HORIZONTAL", "Lock"); lock.counterAxisAlignItems = "CENTER"; gap(lock, 6); c.appendChild(lock); lock.layoutSizingHorizontal = "FILL";
    const li = iconInst("lock", 12, C.ink, 0.6); if (li) lock.appendChild(li);
    lock.appendChild(await text("Nothing is saved unless you choose.", "ui/helper", C.ink, 0.6));
    c.addComponentProperty("Show lock", "BOOLEAN", true);
    lock.componentPropertyReferences = { visible: propKey(c, "Show lock") };
    c.description = "ChatSuggestion (.cs-suggest). Swap the button labels: 'Walk with me', 'Find one small step together', 'Visit “…”'.";
    row.appendChild(c); made.push("ChatSuggestion");
  } else skipped.push("ChatSuggestion");

  if (!exists("SearchField")) {
    const row = await block("search field", "Moments search (.mm-search): a 44px hand-drawn field with the search mark, a small clear button once there are words, and 'Cancel' as words.");
    const vs = [];
    for (const state of ["Empty", "Typing"]) {
      const c = figma.createComponent(); c.name = "State=" + state;
      c.layoutMode = "HORIZONTAL"; c.counterAxisAlignItems = "CENTER"; gap(c, 2); hugWidth(c, 358); c.fills = [];
      const box = auto("HORIZONTAL", "Field"); box.counterAxisAlignItems = "CENTER"; gap(box, 8); pad(box, 0, 6, 0, 14); box.cornerRadius = 14;
      c.appendChild(box); box.layoutSizingHorizontal = "FILL"; box.minHeight = 44;
      stroke(box, C.ink, state === "Typing" ? 1.6 : 1, state === "Typing" ? 1 : 0.35);
      const si = iconInst("search", 18, C.ink, 0.6); if (si) box.appendChild(si);
      const typed = state === "Typing";
      const t = await text(typed ? "meadow" : "Search your moments", "editorial/body", C.ink, typed ? 1 : 0.35);
      t.fontSize = 16; box.appendChild(t); t.layoutSizingHorizontal = "FILL";
      if (typed) {
        const cl = auto("HORIZONTAL", "Clear"); cl.resize(28, 28); cl.primaryAxisSizingMode = "FIXED"; cl.counterAxisSizingMode = "FIXED";
        cl.primaryAxisAlignItems = "CENTER"; cl.counterAxisAlignItems = "CENTER"; cl.cornerRadius = 999;
        if (ink08) fill(cl, ink08); else fill(cl, C.ink, 0.08);
        const x = iconInst("close", 14, C.ink, 0.8); if (x) cl.appendChild(x);
        box.appendChild(cl);
      }
      if (tv0) { const b = tv0.createInstance(); if (lk0) b.setProperties({ [lk0]: "Cancel" }); c.appendChild(b); }
      vs.push(c);
    }
    const set = figma.combineAsVariants(vs, row); set.name = "SearchField";
    layoutSet(set, 1); set.description = "SearchField (components/sisi/moments/MomentsScreen.tsx · .mm-search).";
    made.push("SearchField");
  } else skipped.push("SearchField");

  if (!exists("FieldMessage")) {
    const row = await block("field message", "Under a field: .ds-helper (ink 60%) for a hint, .ds-error (coral) when something went wrong. Both UI type, meta size.");
    const vs = [];
    for (const kind of ["Helper", "Error"]) {
      const c = figma.createComponent(); c.name = "Kind=" + kind;
      c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "AUTO"; c.fills = [];
      c.appendChild(await text(kind === "Error" ? "That link has expired. Ask for a new one." : "We'll send a link to this email.", "ui/helper", kind === "Error" ? C.coral : C.ink, kind === "Error" ? 1 : 0.6));
      vs.push(c);
    }
    const set = figma.combineAsVariants(vs, row); set.name = "FieldMessage";
    set.addComponentProperty("Text", "TEXT", "We'll send a link to this email.");
    for (const v of set.children) v.findOne((n) => n.type === "TEXT").componentPropertyReferences = { characters: propKey(set, "Text") };
    layoutSet(set, 2); made.push("FieldMessage");
  } else skipped.push("FieldMessage");

  // a worked example: the whole talk, from instances
  const EX = "Example / Talk with Sísí (synced)";
  if (!page.findOne((n) => n.type === "FRAME" && n.name === EX)) {
    const fp = page.findOne((n) => n.type === "COMPONENT" && n.name === "FocusPaper");
    const cm = findSet("ChatMessage"), ci = findSet("ChatInput"), cs = page.findOne((n) => n.type === "COMPONENT" && n.name === "ChatSuggestion");
    const rc = findSet("ReplyChip");
    const ex = auto("VERTICAL", EX); hugWidth(ex, 390); fill(ex, C.paper); radius(ex, [20, 18, 0, 0]); pad(ex, 24, 24, 16, 24); gap(ex, 12);
    await ex.setEffectStyleIdAsync(ES["shadow/sheet"].id);
    const greet = auto("VERTICAL", "Greeting"); greet.counterAxisAlignItems = "CENTER"; gap(greet, 6); ex.appendChild(greet); greet.layoutSizingHorizontal = "FILL";
    greet.appendChild(await text("I’m here.", "editorial/screen-title", C.ink));
    greet.appendChild(await text("What’s on your mind?", "editorial/dialogue", C.ink));
    if (rc) {
      const chips = auto("HORIZONTAL", "Ways to begin"); chips.layoutWrap = "WRAP"; gap(chips, 8); chips.counterAxisSpacing = 8; ex.appendChild(chips); chips.layoutSizingHorizontal = "FILL";
      const rck = propKey(rc, "Label") || Object.keys(rc.componentPropertyDefinitions).find((k) => rc.componentPropertyDefinitions[k].type === "TEXT");
      for (const l of ["I feel stuck", "Help me with a Star", "Something good happened"]) { const i = (rc.defaultVariant || rc.children[0]).createInstance(); if (rck) i.setProperties({ [rck]: l }); chips.appendChild(i); }
    }
    const msg = (from, str) => { if (!cm) return; const i = cm.children.find((v) => v.name === "From=" + from).createInstance(); const k = propKey(cm, "Text"); if (k && str) i.setProperties({ [k]: str }); ex.appendChild(i); i.layoutSizingHorizontal = "FILL"; };
    msg("You", "I keep thinking about the move");
    msg("Sísí", "That sounds like a lot to carry. Would you like to keep this feeling somewhere, so you can look back on it?");
    if (cs) { const i = cs.createInstance(); ex.appendChild(i); i.layoutSizingHorizontal = "FILL"; }
    msg("Kept", "Kept in Moments");
    if (ci) { const i = ci.children.find((v) => v.name === "State=Typing").createInstance(); ex.appendChild(i); i.layoutSizingHorizontal = "FILL"; }
    page.appendChild(ex); ex.x = host.x + host.width + 120; ex.y = 0;
    made.push("Example / Talk with Sísí");
  }

  note("components: " + (made.length ? made.length + " new (" + made.join(", ") + ")" : "nothing new") + (skipped.length ? " · already there: " + skipped.join(", ") : ""));
}

// ── 5 · foundations specimen ─────────────────────────────────────────────
async function buildSpecimen(page, C) {
  await figma.setCurrentPageAsync(page);
  const NAME = "Foundations / Code tokens (synced)";
  const old = page.findOne((n) => n.type === "FRAME" && n.name === NAME && n.parent === page);
  let x = 0, y = 0;
  if (old) { x = old.x; y = old.y; old.remove(); }
  else x = page.children.reduce((m, n) => Math.max(m, n.x + n.width), 0) + 160;
  const f = auto("VERTICAL", NAME); f.x = x; f.y = y; gap(f, 40); pad(f, 64, 64, 64, 64); fill(f, C.paper);
  hugWidth(f, 1200);
  page.appendChild(f);
  f.appendChild(await text("code tokens", "editorial/display", C.ink));
  const sub = await text("synced from design-system/*.css on " + DATA.builtAt + ". Edit variables and styles here; tell Claude to carry the change back to code.", "ui/meta", C.ink, 0.6);
  f.appendChild(sub);
  const section = async (t) => { const s = auto("VERTICAL", "Section / " + t); gap(s, 16); f.appendChild(s); s.layoutSizingHorizontal = "FILL"; s.appendChild(await text(t, "editorial/card-title", C.ink)); return s; };
  const wrap = (s) => { const w = auto("HORIZONTAL", "Items"); w.layoutWrap = "WRAP"; gap(w, 16); w.counterAxisSpacing = 16; s.appendChild(w); w.layoutSizingHorizontal = "FILL"; return w; };

  // colours
  const sc = await section("colour — five, and their opacities");
  const cw = wrap(sc);
  for (const c of DATA.colors) {
    const cell = auto("VERTICAL", "Swatch / " + c.css); gap(cell, 6); cw.appendChild(cell);
    const sw = figma.createRectangle(); sw.resize(120, 72); sw.cornerRadius = 10; fill(sw, V(c.css));
    sw.strokes = [{ type: "SOLID", color: { r: 16 / 255, g: 45 / 255, b: 50 / 255 }, opacity: 0.12 }];
    cell.appendChild(sw);
    cell.appendChild(await text("--" + c.css, "ui/label", C.ink));
    const h = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
    cell.appendChild(await text("#" + h(c.value.r) + h(c.value.g) + h(c.value.b) + (c.value.a < 1 ? " · " + Math.round(c.value.a * 100) + "%" : ""), "ui/meta", C.ink, 0.6));
  }
  // type
  const st = await section("type — as on a 390-wide phone");
  for (const [name, style] of Object.entries(TS)) {
    const r = auto("HORIZONTAL", "Type / " + name); r.counterAxisAlignItems = "BASELINE"; gap(r, 24); st.appendChild(r);
    const lab = await text(name + "  " + style.fontSize + "px", "ui/meta", C.ink, 0.6); lab.resize(220, lab.height); lab.textAutoResize = "HEIGHT"; r.appendChild(lab);
    r.appendChild(await text(name.indexOf("ui/") === 0 ? "Still walking · Nov 12" : "what is meant for you is on its way", name, C.ink));
  }
  // spacing
  const ss = await section("space · sizes");
  for (const s of DATA.sizes) {
    const r = auto("HORIZONTAL", "Size / " + s.css); r.counterAxisAlignItems = "CENTER"; gap(r, 16); ss.appendChild(r);
    const lab = await text("--" + s.css + "  " + s.value + "px", "ui/meta", C.ink, 0.6); lab.resize(220, lab.height); lab.textAutoResize = "HEIGHT"; r.appendChild(lab);
    const bar = figma.createRectangle(); bar.resize(Math.max(1, s.value), 12); bar.cornerRadius = 2; fill(bar, C.blue);
    if (V(s.css)) { try { bar.setBoundVariable("width", V(s.css)); } catch (e) {} }
    r.appendChild(bar);
  }
  // motion + layers
  const sm = await section("motion · layers");
  const lines = DATA.ms.map((m) => "--" + m.css + "  " + m.value + "ms").concat(["--ease-sisi  cubic-bezier(0.22, 1, 0.36, 1) — gentle, no bounce"], DATA.z.map((z) => "--" + z.css + "  " + z.value));
  sm.appendChild(await text(lines.join("\n"), "ui/meta", C.ink, 0.8));
  // the log
  const sl = await section("this sync");
  sl.appendChild(await text(log.join("\n"), "ui/meta", C.ink, 0.8));
}

// ── run ──────────────────────────────────────────────────────────────────
async function main() {
  const pages = figma.root.children;
  const pFound = pages.find((p) => p.name.indexOf("Foundations") === 0) || pages[0];
  const pIcons = pages.find((p) => p.name.indexOf("Icons") === 0);
  const pComp = pages.find((p) => p.name.indexOf("Components") === 0);
  if (!pIcons || !pComp) { figma.closePlugin("This doesn't look like the Sísí Design System file (no Icons / Components pages)."); return; }

  await pickFonts();
  await loadVars();
  const step = async (label, fn) => { try { await fn(); } catch (e) { note("⚠ " + label + ": " + (e && e.message ? e.message : e)); } };
  await step("variables", syncVariables);
  // semantic colours already used by the file's components (ids from the file), code variables as fallback
  const C = {
    ink: (await byId("2:54")) || V("sisi-ink"),
    paper: (await byId("2:46")) || V("sisi-paper"),
    icon: (await byId("2:60")) || V("sisi-ink"),
    gold: (await byId("2:74")) || V("sisi-gold"),
    goldDeep: V("sisi-gold-deep"),
    coral: V("sisi-coral"),
    blue: V("sisi-blue"),
    rMenu: (await byId("2:92")),
  };
  await step("styles", syncStyles);
  await step("icons", () => syncIcons(pIcons, C));
  await step("components", () => buildComponents(pComp, C));
  await step("foundations", () => buildSpecimen(pFound, C));
  figma.closePlugin("Sísí DS synced · " + log.filter((l) => l.indexOf("⚠") !== 0).length + " steps" + (log.some((l) => l.indexOf("⚠") === 0) ? " · some warnings — see the 'this sync' box on Foundations" : ""));
}
main().catch((e) => figma.closePlugin("Sync stopped: " + (e && e.message ? e.message : e)));
