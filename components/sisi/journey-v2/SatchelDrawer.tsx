"use client";

import { fxAnchorRef } from "@/lib/fxAnchors";
import { softGlint } from "@/lib/fx";
import { haptic } from "@/lib/haptics";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { onStarlight, starlightBalance } from "@/lib/starlight";
import { SATCHEL_CATALOG, loadSatchel, type SatchelCategory, type SatchelState } from "@/lib/satchel";
import { WORLDS, WORLD_LOOK, equipWorld, useEquippedWorld, worldAsset, type WorldId } from "@/lib/worlds";
import { FocusPaper, IconCheck, IconFlower, IconFox, IconLandscape, IconLock, StarGlyph } from "@/components/ds";

/**
 * SatchelDrawer — Customize (optional, secondary).
 *
 * A low ivory sheet over the Journey. Nothing behind it dims or blurs, and
 * it stays short enough that Sísí and the world remain in view — so every
 * change is seen live, the moment a card is tapped.
 *
 *   tabs    pictures, not words: Sísí (her face) · Trail (a wayside flower)
 *           · World (a landscape); the chosen one rests on a soft paper tile
 *   cards   one row of large picture cards that scrolls sideways; the name
 *           and its state below. Walking here = solid outline + check;
 *           yours = plain; still to discover = dashed outline + lock
 *   balance Starlight, upper right. Worlds open with cumulative Starlight —
 *           nothing is spent, there are no prices.
 */

const TABS: { key: SatchelCategory; label: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { key: "sisi", label: "Sísí", Icon: IconFox },
  { key: "trail", label: "Trail", Icon: IconFlower },
  { key: "world", label: "World", Icon: IconLandscape },
];

type Card = {
  id: string;
  name: string;
  art: React.ReactNode;
  state: "equipped" | "owned" | "locked";
  /** words under the name */
  note: React.ReactNode;
  onPick?: (el: HTMLElement) => void;
};

export function SatchelDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  /** @deprecated the World is applied through lib/worlds */
  onEquip?: (equipped: SatchelState["equipped"]) => void;
}) {
  const [tab, setTab] = useState<SatchelCategory>("world");
  const [balance, setBalance] = useState<number | null>(null);
  const [state, setState] = useState<SatchelState | null>(null);
  const world = useEquippedWorld();
  const rowRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    starlightBalance().then(setBalance);
    loadSatchel().then(setState);
    return onStarlight((r) => setBalance(r.balance));
  }, [open]);

  // only the very next World shows how far away it is; the rest simply wait
  const nextWorld = [...WORLDS].sort((a, b) => a.threshold - b.threshold).find((w) => w.threshold > (balance ?? 0));
  const [howOpen, setHowOpen] = useState(false);
  const cards: Card[] =
    tab === "world"
      ? WORLDS.map((w) => {
          const unlocked = (balance ?? 0) >= w.threshold;
          const equipped = world === w.id;
          const need = Math.max(0, w.threshold - (balance ?? 0));
          return {
            id: w.id,
            name: w.name,
            art: <WorldPreview id={w.id} />,
            state: equipped ? "equipped" : unlocked ? "owned" : "locked",
            note: equipped ? (
              "Walking here"
            ) : unlocked ? (
              "Tap to walk here"
            ) : w.id === nextWorld?.id ? (
              <>
                <StarGlyph size={12} /> {need} more to unlock
              </>
            ) : (
              "Still to discover"
            ),
            onPick: unlocked && !equipped ? (el) => { equipWorld(w.id); softGlint(el); haptic("select", el); } : undefined,
          };
        })
      : SATCHEL_CATALOG.filter((i) => i.category === tab).map((item) => {
          const equipped = state?.equipped[item.category] === item.id;
          return {
            id: item.id,
            name: item.name.replace("SiSi", "Sísí"),
            // eslint-disable-next-line @next/next/no-img-element
            art: <img src={item.preview} alt="" className={`sd-card-img is-${item.category}`} />,
            state: equipped ? "equipped" : "owned",
            note: equipped ? "With you" : "Yours",
          };
        });

  // Keep Sísí in view: while the sheet is up, the whole world rises just
  // enough that her paws rest a little above the sheet's edge (and settles
  // back when it closes). Measured, so it fits any screen height.
  useEffect(() => {
    const el = document.documentElement;
    if (!open) {
      el.classList.remove("sd-lifting");
      return;
    }
    const measure = () => {
      const sheet = document.querySelector<HTMLElement>(".sd-focus");
      const cat = document.querySelector(".walking-cat")?.getBoundingClientRect();
      if (!sheet || !cat) return;
      // the sheet's resting top (it may still be sliding in) and where her
      // paws are without any lift
      const sheetTop = window.innerHeight - sheet.offsetHeight;
      const current = el.classList.contains("sd-lifting") ? parseFloat(el.style.getPropertyValue("--sd-lift") || "0") : 0;
      const lift = Math.max(0, Math.round(cat.bottom + current - (sheetTop - 14)));
      el.style.setProperty("--sd-lift", `${lift}px`);
      el.classList.add("sd-lifting");
    };
    const t = setTimeout(measure, 60); // once the sheet has its height
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      el.classList.remove("sd-lifting");
    };
  }, [open]);

  // open on the one in use, centred in the row
  useLayoutEffect(() => {
    if (!open) return;
    const row = rowRef.current;
    const on = row?.querySelector<HTMLElement>(".sd-card.is-equipped");
    if (row && on) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
  }, [open, tab, cards.length]);

  return (
    <FocusPaper
      open={open}
      onClose={onClose}
      live
      closeLabel="Close Customize"
      title={
        <div className="sd-tabs" role="tablist" aria-label="Customize">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              aria-label={label}
              title={label}
              className={`sd-tab${tab === key ? " is-on" : ""}`}
              onClick={() => setTab(key)}
            >
              <Icon size={26} />
            </button>
          ))}
        </div>
      }
      headerExtra={
        <span className="sd-balance" ref={(el) => fxAnchorRef("starlightCounter", el)} aria-label={`${balance ?? 0} Starlight`}>
          <StarGlyph size={16} />
          <span className="sd-balance-n">{balance ?? "·"}</span>
          <span className="sd-balance-word">Starlight</span>
        </span>
      }
      className="sd-focus"
    >
      {/* the sheet opens with focus here (quietly), not on a tab — so no focus ring shows by itself */}
      <ul className="sd-row" ref={rowRef} role="tabpanel" tabIndex={-1} data-autofocus aria-label={TABS.find((t) => t.key === tab)?.label}>
        {cards.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`sd-card is-${c.state}`}
              aria-pressed={c.state === "equipped"}
              aria-disabled={!c.onPick}
              onClick={(e) => c.onPick?.(e.currentTarget)}
            >
              <span className="sd-card-art">
                {c.art}
                {c.state !== "owned" && (
                  <span className="sd-badge" aria-hidden>
                    {c.state === "equipped" ? <IconCheck size={20} /> : <IconLock size={18} />}
                  </span>
                )}
              </span>
              <span className="sd-card-name">{c.name}</span>
              <span className="sd-card-note">{c.note}</span>
            </button>
          </li>
        ))}
      </ul>
      {/* how it grows (and the gentle daily limit) lives here, quietly — never as a goal */}
      <div className="sd-how">
        <button type="button" className="ds-text-action sd-how-toggle" aria-expanded={howOpen} onClick={() => setHowOpen((o) => !o)}>
          How Starlight grows
        </button>
        {howOpen && (
          <p className="sd-how-text">
            Starlight gathers from time with Sísí: picturing a wish, walking with it, a good thing or a small step — up to 3 a day.
            It is never spent. It opens new worlds, and whatever opens stays yours.
          </p>
        )}
      </div>
      <style jsx global>{`
        /* the world rises while the sheet is up (see the lift effect) */
        .journey-stage-v2 .jw-group { transition: translate 460ms var(--ease-sisi); }
        html.sd-lifting .journey-stage-v2 .jw-group { translate: 0 calc(-1 * var(--sd-lift, 0px)); }
        /* a low sheet: Sísí and the world stay in view above it */
        .sd-focus { max-height: min(54dvh, 440px) !important; }
        .sd-focus .ds-focus-head { padding-top: 22px; }
        .sd-focus .ds-focus-body { padding: 14px 0 calc(var(--space-5) + var(--safe-bottom)); }
        .sd-tabs { display: flex; gap: 6px; }
        .sd-tab {
          display: inline-flex; align-items: center; justify-content: center;
          width: 56px; height: 48px; border: 0; border-radius: 14px; cursor: pointer;
          background: transparent; color: var(--ink-60);
          transition: background var(--motion-instant) ease, color var(--motion-instant) ease, transform var(--motion-instant) ease;
          -webkit-tap-highlight-color: transparent;
        }
        .sd-tab:active { transform: scale(0.94); }
        .sd-tab.is-on { background: var(--ink-08); color: var(--sisi-ink); }
        .sd-tab:focus-visible { outline: 2px solid var(--sisi-ink); outline-offset: 2px; }
        .sd-balance { flex: none; display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 6px; color: var(--sisi-ink); }
        .sd-balance-n { font-family: var(--font-editorial); font-size: 17px; }
        .sd-balance-word { font-family: var(--font-ui); font-size: 13px; color: var(--ink-60); letter-spacing: 0.01em; }
        .sd-how { padding: 6px var(--focus-pad) 0; }
        .sd-how-toggle { padding-left: 0 !important; min-height: 40px; font-size: 14px !important; color: var(--ink-60) !important; }
        .sd-how-text { margin: 0 0 6px; font-family: var(--font-editorial); font-size: 14px; line-height: 1.45; color: var(--ink-80); max-width: 36ch; }

        /* one row of big cards that bleeds to the sheet's edges */
        .sd-row {
          list-style: none; margin: 0; display: flex; gap: 12px;
          padding: 4px var(--focus-pad) 6px; overflow-x: auto; overscroll-behavior-x: contain;
          scroll-snap-type: x mandatory; scroll-padding: 0 var(--focus-pad); scrollbar-width: none;
        }
        .sd-row::-webkit-scrollbar { display: none; }
        .sd-row > li { flex: none; scroll-snap-align: center; }
        .sd-card {
          display: flex; flex-direction: column; align-items: center; gap: 4px; width: 132px;
          padding: 0; border: 0; background: none; color: var(--sisi-ink); font: inherit; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .sd-card[aria-disabled="true"] { cursor: default; }
        .sd-card-art {
          position: relative; display: block; width: 132px; height: 112px; overflow: hidden;
          border-radius: 18px; background: var(--ink-08);
          transition: transform var(--motion-instant) ease;
        }
        /* the frame is drawn over the picture (an image would hide an inset shadow) */
        .sd-card-art::after {
          content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          box-shadow: inset 0 0 0 1px var(--ink-14);
        }
        .sd-card:active .sd-card-art { transform: scale(0.97); }
        .sd-card.is-equipped .sd-card-art::after { box-shadow: inset 0 0 0 2px var(--sisi-ink); }
        .sd-card.is-locked .sd-card-art::after { box-shadow: none; border: 1.5px dashed var(--ink-35); }
        .sd-badge { z-index: 1; }
        .sd-row:focus { outline: none; }
        .sd-card.is-locked .sd-world-thumb, .sd-card.is-locked .sd-card-img { filter: saturate(0.35) brightness(0.92); opacity: 0.72; }
        .sd-world-thumb, .sd-card-img { display: block; width: 100%; height: 100%; object-fit: cover; }
        /* Sísí sits whole in her card */
        .sd-card-img.is-sisi { object-fit: contain; padding: 10px 12px 8px; box-sizing: border-box; }
        .sd-world-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* a small scene from the Journey's own layers */
        .sd-scene { position: relative; overflow: hidden; }
        .sd-scene img { position: absolute; display: block; pointer-events: none; }
        .sd-scene .sd-scene-sky, .sd-scene .sd-scene-own { inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .sd-scene .sd-scene-cloud { width: 62%; height: auto; object-fit: contain; opacity: 0.95; }
        .sd-scene .c1 { left: 6%; top: 14%; }
        .sd-scene .c2 { right: -8%; top: 30%; width: 54%; }
        .sd-scene .sd-scene-tree { right: 12%; bottom: 13%; width: 30%; height: auto; object-fit: contain; }
        .sd-scene .sd-scene-meadow { left: 0; right: 0; bottom: 0; width: 100%; height: 34%; object-fit: cover; object-position: center top; }
        /* winter: a hush of snow-light over everything */
        .sd-scene.is-quiet-winter::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), rgba(240, 244, 250, 0.38)); }
        .sd-badge {
          position: absolute; left: 8px; top: 8px; display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 50%; background: var(--sisi-paper); color: var(--sisi-ink);
          box-shadow: 0 1px 3px rgba(16, 45, 50, 0.18);
        }
        .sd-card-name { margin-top: 6px; font-family: var(--font-editorial); font-size: 16px; line-height: 1.2; letter-spacing: -0.02em; text-align: center; }
        .sd-card-note { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-ui); font-size: var(--text-meta); color: var(--ink-60); letter-spacing: 0.005em; }
        .sd-card.is-equipped .sd-card-note { color: var(--sisi-ink); font-weight: 500; }
      `}</style>
    </FocusPaper>
  );
}

/** the meadow each World walks through (until its own pack arrives) */
const PREVIEW_MEADOW: Record<WorldId, "morning" | "afternoon" | "evening"> = {
  "morning-meadow": "morning",
  "cloud-garden": "afternoon",
  "golden-afternoon": "afternoon",
  "evening-field": "evening",
  "quiet-winter": "morning",
};

/**
 * The World's own preview when its pack has arrived; otherwise a small scene
 * made of the Journey's real layers (its sky, clouds, a far tree and the
 * meadow), in the World's own light — never a flat swatch.
 */
function WorldPreview({ id }: { id: WorldId }) {
  const [own, setOwn] = useState(true);
  const look = WORLD_LOOK[id];
  const many = look.clouds >= 1.4;
  return (
    <span className={`sd-world-thumb sd-scene is-${id}`} aria-hidden style={{ filter: look.grade }}>
      {own ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sd-scene-own" src={worldAsset(id, "preview")} alt="" onError={() => setOwn(false)} />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sd-scene-sky" src={look.preview} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sd-scene-cloud c1" src="/V2/time-of-day/cloud-04-mid-rounded.webp" alt="" />
          {many && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="sd-scene-cloud c2" src="/V2/time-of-day/cloud-06-mid-broken.webp" alt="" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sd-scene-tree" src="/V2/time-of-day/tree-far-01.webp" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sd-scene-meadow" src={`/V2/time-of-day/meadow-strip-${PREVIEW_MEADOW[id]}.webp`} alt="" />
        </>
      )}
    </span>
  );
}
