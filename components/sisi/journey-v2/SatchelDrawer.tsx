"use client";

import { fxAnchorRef } from "@/lib/fxAnchors";
import { softGlint } from "@/lib/fx";
import { haptic } from "@/lib/haptics";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { onStarlight, starlightBalance } from "@/lib/starlight";
import { WORLDS, WORLD_LOOK, equipWorld, placesGranted, useEquippedWorld } from "@/lib/worlds";
import { FocusPaper, IconCheck, IconLock, StarGlyph } from "@/components/ds";

/**
 * SatchelDrawer — the Map: where you walk.
 *
 * A low ivory sheet over the Journey. Nothing behind it dims or blurs, and
 * it stays short enough that Sísí and the world remain in view — so a new
 * place is seen live, the moment its card is tapped.
 *
 *   cards   one row of large picture cards (the place itself: its path, its
 *           water or trees, Sísí walking), scrolling sideways; the name and
 *           its state below. Walking here = solid outline + check; open =
 *           plain; still to discover = dashed outline + lock
 *   the end "More places are on the way" — the Map keeps growing
 *   balance Starlight, upper right. Places open with cumulative Starlight —
 *           nothing is spent, there are no prices. (The sky is not chosen:
 *           it follows the real time of day, and the weather if asked.)
 */

type Card = {
  id: string;
  name: string;
  art: React.ReactNode;
  state: "equipped" | "owned" | "locked" | "soon";
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
  /** @deprecated the place is applied through lib/worlds */
  onEquip?: (equipped: unknown) => void;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [granted, setGranted] = useState<string[]>([]);
  const world = useEquippedWorld();
  const rowRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    starlightBalance().then(setBalance);
    setGranted(placesGranted());
    return onStarlight((r) => setBalance(r.balance));
  }, [open]);

  // only the very next place shows how far away it is; the rest simply wait
  const isOpen = (id: string, threshold: number) => (balance ?? 0) >= threshold || granted.includes(id) || world === id;
  const nextPlace = [...WORLDS].sort((a, b) => a.threshold - b.threshold).find((w) => !isOpen(w.id, w.threshold));
  const cards: Card[] = [
    ...WORLDS.map((w): Card => {
      const unlocked = isOpen(w.id, w.threshold);
      const equipped = world === w.id;
      const need = Math.max(0, w.threshold - (balance ?? 0));
      return {
        id: w.id,
        name: w.name,
        // eslint-disable-next-line @next/next/no-img-element
        art: <img className="sd-card-img" src={WORLD_LOOK[w.id].preview} alt="" draggable={false} />,
        state: equipped ? "equipped" : unlocked ? "owned" : "locked",
        note: equipped ? (
          "Walking here"
        ) : unlocked ? (
          "Tap to walk here"
        ) : w.id === nextPlace?.id ? (
          <>
            <StarGlyph size={12} /> {need} more to unlock
          </>
        ) : (
          "Still to discover"
        ),
        onPick: unlocked && !equipped ? (el) => { equipWorld(w.id); softGlint(el); haptic("select", el); } : undefined,
      };
    }),
    // the Map keeps growing
    { id: "soon", name: "More places", art: <span className="sd-soon" aria-hidden><StarGlyph size={22} /></span>, state: "soon", note: "On the way" },
  ];

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
  }, [open, cards.length]);

  return (
    <FocusPaper
      open={open}
      onClose={onClose}
      live
      closeLabel="Close the Map"
      title={<h2 className="sd-title">Map</h2>}
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
      <ul className="sd-row" ref={rowRef} tabIndex={-1} data-autofocus aria-label="Places">
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
                {(c.state === "equipped" || c.state === "locked") && (
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
      {/* how Starlight grows: Sísí says it herself, once, above the sheet (Journey) */}
      <style jsx global>{`
        /* the world rises while the sheet is up (see the lift effect) */
        .journey-stage-v2 .jw-group { transition: translate 460ms var(--ease-sisi); }
        html.sd-lifting .journey-stage-v2 .jw-group { translate: 0 calc(-1 * var(--sd-lift, 0px)); }
        /* her words (and where her head is) rise with her, so they never cover her face */
        .journey-stage-v2 .cc-root, .journey-stage-v2 .cc-head, .journey-stage-v2 .sisi-speak-lines { transition: translate 460ms var(--ease-sisi); }
        html.sd-lifting .journey-stage-v2 .cc-root, html.sd-lifting .journey-stage-v2 .cc-head, html.sd-lifting .journey-stage-v2 .sisi-speak-lines { translate: 0 calc(-1 * var(--sd-lift, 0px)); }
        /* a low sheet: Sísí and the world stay in view above it */
        .sd-focus { max-height: min(54dvh, 440px) !important; }
        .sd-focus .ds-focus-head { padding-top: 22px; }
        .sd-focus .ds-focus-body { padding: 14px 0 calc(var(--space-5) + var(--safe-bottom)); }
        .sd-title { margin: 0; font-family: var(--font-editorial); font-weight: 400; font-size: var(--text-paper-title); line-height: 1.2; color: var(--sisi-ink); }
        .sd-soon { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: var(--ink-35); }
        .sd-card.is-soon .sd-card-art { background: none; }
        .sd-card.is-soon .sd-card-art::after { box-shadow: none; border: 1.5px dashed var(--ink-14); }
        .sd-card.is-soon .sd-card-name { color: var(--ink-60); }
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
