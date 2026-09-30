"use client";

import { useEffect, useState } from "react";
import { onStarlight, starlightBalance } from "@/lib/starlight";
import { SATCHEL_CATALOG, loadSatchel, type SatchelCategory, type SatchelState } from "@/lib/satchel";
import { WORLDS, WORLD_LOOK, equipWorld, useEquippedWorld, worldAsset, type WorldId } from "@/lib/worlds";
import { FilterChip, FocusPaper, StarGlyph } from "@/components/ds";

/**
 * SatchelDrawer — Customize (optional, secondary).
 *
 * A warm-ivory drawer rises over the Journey (the world stays visible so a
 * change can be seen live). The Starlight balance sits in the upper right.
 * Tabs: Sísí · Trail · World. Worlds open with cumulative Starlight —
 * nothing is spent, there are no prices. World states:
 *   equipped  "Walking here"
 *   owned     "Use this World"
 *   locked    "N more Starlight to discover"
 */

const TABS: { key: SatchelCategory; label: string }[] = [
  { key: "sisi", label: "Sísí" },
  { key: "trail", label: "Trail" },
  { key: "world", label: "World" },
];

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

  useEffect(() => {
    if (!open) return;
    starlightBalance().then(setBalance);
    loadSatchel().then(setState);
    return onStarlight((r) => setBalance(r.balance));
  }, [open]);

  const items = SATCHEL_CATALOG.filter((i) => i.category === tab);

  return (
    <FocusPaper
      open={open}
      onClose={onClose}
      closeLabel="Close Customize"
      title={
        <div className="ds-chip-row" role="group" aria-label="Customize">
          {TABS.map((t) => (
            <FilterChip key={t.key} selected={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </FilterChip>
          ))}
        </div>
      }
      headerExtra={
        <span className="sd-balance" aria-label={`${balance ?? 0} Starlight`}>
          <StarGlyph size={15} />
          <span className="sd-balance-n">{balance ?? "·"}</span>
          <span className="sd-balance-l">Starlight</span>
        </span>
      }
      className="sd-focus"
    >
      {tab === "world" ? (
        <ul className="sd-worlds">
          {WORLDS.map((w) => {
            const unlocked = (balance ?? 0) >= w.threshold;
            const equipped = world === w.id;
            const state = equipped ? "equipped" : unlocked ? "owned" : "locked";
            const need = Math.max(0, w.threshold - (balance ?? 0));
            return (
              <li key={w.id}>
                <button
                  type="button"
                  className={`sd-world is-${state}`}
                  disabled={state === "locked"}
                  aria-pressed={equipped}
                  aria-label={`${w.name}: ${state === "equipped" ? "Walking here" : state === "owned" ? "Use this World" : `${need} more Starlight to discover`}`}
                  onClick={() => state === "owned" && equipWorld(w.id)}
                >
                  <WorldPreview id={w.id} />
                  <span className="sd-world-text">
                    <span className="sd-world-name">{w.name}</span>
                    <span className="sd-world-state">
                      {state === "equipped" ? "Walking here" : state === "owned" ? "Use this World" : `${need} more Starlight to discover`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="sd-grid">
          {items.map((item) => {
            const equipped = state?.equipped[item.category] === item.id;
            return (
              <li key={item.id}>
                <div className={`sd-item${equipped ? " is-equipped" : ""}`}>
                  <span className="sd-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.preview} alt="" />
                  </span>
                  <span className="sd-name">{item.name.replace("SiSi", "Sísí")}</span>
                  <span className="t-helper sd-state">{equipped ? "With you" : "Yours"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="ds-helper sd-note">
        {tab === "world" ? "New places open as you spend time with your Stars." : "More will find their way here along the journey."}
      </p>
      <style jsx global>{`
        /* spacing: 24px sides · 20px handle→header · 20px header→first card ·
           14px between cards · bottom max(24px, safe area) · 44px targets */
        .sd-focus .ds-focus-head { padding: 20px 16px 0 24px; min-height: 64px; gap: 8px; }
        .sd-focus .ds-focus-body { padding: 20px 24px 8px; }
        .sd-focus { padding-bottom: max(24px, env(safe-area-inset-bottom)); }
        .sd-focus .ds-focus-title { min-width: 0; }
        .sd-balance {
          flex: none; display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 4px;
          color: var(--sisi-ink);
        }
        .sd-balance-n { font-family: var(--font-editorial); font-size: 17px; }
        .sd-balance-l { font-family: var(--font-ui); font-size: var(--text-meta); color: var(--ink-60); letter-spacing: 0.005em; }
        .sd-worlds, .sd-grid { list-style: none; margin: 0; padding: 0; }
        .sd-worlds { display: flex; flex-direction: column; gap: 14px; }
        .sd-world {
          display: flex; align-items: center; gap: 14px; width: 100%; min-height: 76px; padding: 10px 14px 10px 10px;
          border: 1px solid var(--ink-14); border-radius: 14px; background: var(--paper-60); color: var(--sisi-ink);
          text-align: left; cursor: pointer; font: inherit;
          transition: border-color var(--motion-instant) ease, opacity var(--motion-instant) ease;
        }
        .sd-world.is-owned:hover { border-color: var(--ink-35); }
        .sd-world.is-equipped { border-color: var(--sisi-ink); box-shadow: 0 0 0 1px var(--sisi-ink) inset; cursor: default; }
        .sd-world.is-locked { cursor: default; }
        .sd-world.is-locked .sd-world-thumb { filter: saturate(0.35) brightness(0.9); opacity: 0.7; }
        .sd-world-thumb {
          position: relative; flex: 0 0 72px; width: 72px; height: 56px; border-radius: 10px; overflow: hidden; background: var(--sisi-blue);
        }
        .sd-world-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sd-world-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .sd-world-name { font-family: var(--font-editorial); font-size: var(--text-card-title); line-height: var(--leading-title); }
        .sd-world-state { font-family: var(--font-ui); font-size: var(--text-meta); color: var(--ink-60); letter-spacing: 0.005em; }
        .sd-world.is-equipped .sd-world-state { color: var(--sisi-ink); }
        .sd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .sd-item {
          display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px 10px; border-radius: 12px;
          border: 1px solid var(--ink-14); background: var(--paper-60); color: var(--sisi-ink); min-height: 44px;
        }
        .sd-item.is-equipped { border-color: var(--sisi-ink); box-shadow: 0 0 0 1px var(--sisi-ink) inset; }
        .sd-thumb { width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: var(--sisi-ink); display: flex; align-items: center; justify-content: center; }
        .sd-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .sd-name { font-family: var(--font-editorial); font-size: 14px; line-height: 1.2; text-align: center; }
        .sd-state { color: var(--ink-60); }
        .sd-note { margin: 20px 0 0; text-align: center; }
      `}</style>
    </FocusPaper>
  );
}

/** The World's own preview when its pack has arrived; otherwise today's sky. */
function WorldPreview({ id }: { id: WorldId }) {
  const [src, setSrc] = useState(worldAsset(id, "preview"));
  return (
    <span className="sd-world-thumb" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onError={() => src !== WORLD_LOOK[id].preview && setSrc(WORLD_LOOK[id].preview)} style={{ filter: WORLD_LOOK[id].grade }} />
    </span>
  );
}
