# Sísí DS Sync (Figma plugin)

Puts the code's design system into the **Sísí Design System** Figma file. It runs as a private development plugin, so it doesn't count against the Figma MCP call limit.

## Run it

1. Open the Sísí Design System file in the **Figma desktop app**.
2. Go to Menu → Plugins → Development → **Import plugin from manifest…** and pick `tools/figma-sync/manifest.json`. You only do this once.
3. Run it from Plugins → Development → **Sísí DS Sync**.

## What it does

Each run reads the code and brings the Figma file up to date:

| Code | Figma |
|---|---|
| `design-system/tokens.css` | Variables: colours in Primitives (matched by their WEB code syntax), space/sizes in Layout, plus new Type and Motion collections. Semantic aliases are left as they are. |
| `design-system/typography.css` | Text styles `editorial/*` and `ui/*`, sized as on a 390-wide phone. Uses Sentient if it is installed, otherwise Newsreader as a stand-in. |
| shadows in `ds.css` | Effect styles `shadow/*` |
| `components/ds/icons.tsx` | `icon/*` components are redrawn in place, so instances update. Missing icons get a new cell. |
| `components/ds/*` | StatusChip is restyled to match the code. New: MenuItem, OverflowMenu, TextField, StarConnectionRow, MemoryPaper, ConfirmationDialog, ModalBackdrop, FocusPaper, ChatInput, ChatMessage, ChatSuggestion, SearchField, FieldMessage, plus an "Example / Talk with Sísí" frame built from instances. |
| everything | "Foundations / Code tokens (synced)", a frame that is rebuilt on every run. Its "this sync" box is the log. |

It is safe to run again:

- Existing variables, styles and icons are updated.
- Components that already exist are skipped. To rebuild one, delete it and run again.
- Nothing you drew yourself is removed.

## After the code changes

```bash
node tools/figma-sync/build.mjs
```

This rebuilds `code.js` from the current code. Then run the plugin again.
