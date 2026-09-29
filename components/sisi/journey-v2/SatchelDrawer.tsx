"use client";

import { useEffect, useState } from "react";
import { lightBalance } from "@/lib/littleLights";
import {
  SATCHEL_CATALOG,
  chooseItem,
  loadSatchel,
  type SatchelCategory,
  type SatchelItem,
  type SatchelState,
} from "@/lib/satchel";
import { FilterChip, FocusPaper, StarGlyph } from "@/components/ds";

/**
 * SatchelDrawer — optional, secondary customization.
 *
 * A warm-ivory drawer rises over the Journey (the world stays visible so
 * changes can be seen live). The Light balance is shown ONLY here.
 * Three categories: SiSi · Trail · World. Item states: Owned · Equipped · ✦ n.
 */

const TABS: { key: SatchelCategory; label: string }[] = [
  { key: "sisi", label: "SiSi" },
  { key: "trail", label: "Trail" },
  { key: "world", label: "World" },
];

export function SatchelDrawer({
  open,
  onClose,
  onEquip,
}: {
  open: boolean;
  onClose: () => void;
  /** Live-apply the equipped set to the Journey. */
  onEquip?: (equipped: SatchelState["equipped"]) => void;
}) {
  const [tab, setTab] = useState<SatchelCategory>("sisi");
  const [balance, setBalance] = useState<number | null>(null);
  const [state, setState] = useState<SatchelState | null>(null);
  const [short, setShort] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setShort(null);
    lightBalance().then(setBalance);
    loadSatchel().then(setState);
  }, [open]);

  const pick = async (item: SatchelItem) => {
    if (!state) return;
    const { state: next, ok } = await chooseItem(state, item);
    if (!ok) {
      setShort(item.id);
      return;
    }
    setState(next);
    onEquip?.(next.equipped);
    lightBalance().then(setBalance);
  };

  const items = SATCHEL_CATALOG.filter((i) => i.category === tab);

  return (
    <FocusPaper
      open={open}
      onClose={onClose}
      closeLabel="Close satchel"
      title={
        <div className="ds-chip-row" role="group" aria-label="Satchel">
          {TABS.map((t) => (
            <FilterChip key={t.key} selected={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </FilterChip>
          ))}
        </div>
      }
      headerExtra={
        <span className="t-status sd-balance" aria-label={`${balance ?? 0} Little Lights`}>
          <StarGlyph size={16} /> {balance ?? "·"}
        </span>
      }
      className="sd-focus"
    >
      <div className="sd-grid">
        {items.map((item) => {
          const owned = state?.owned.has(item.id) ?? item.cost === 0;
          const equipped = state?.equipped[item.category] === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={equipped}
              className={`sd-item${equipped ? " is-equipped" : ""}`}
              onClick={() => pick(item)}
            >
              <span className="sd-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.preview} alt="" />
              </span>
              <span className="sd-name">{item.name}</span>
              <span className="t-helper sd-state">
                {equipped ? "Equipped" : owned ? "Owned" : `✦ ${item.cost}`}
              </span>
              {short === item.id && <span className="t-helper sd-short">A few more Lights</span>}
            </button>
          );
        })}
      </div>
      <p className="ds-helper sd-note">More will find their way into your satchel along the journey.</p>
      <style jsx global>{`
        .sd-balance { display: inline-flex; align-items: center; gap: 5px; padding: 0 4px; color: var(--sisi-ink); font-size: var(--text-meta); }
        .sd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .sd-item {
          position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 8px 6px 10px; border-radius: 12px; border: 1px solid var(--ink-14);
          background: var(--paper-60); cursor: pointer; color: var(--sisi-ink);
        }
        .sd-item.is-equipped { border-color: var(--sisi-ink); box-shadow: 0 0 0 1px var(--sisi-ink) inset; }
        .sd-thumb {
          width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden;
          background: var(--sisi-ink); display: flex; align-items: center; justify-content: center;
        }
        .sd-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .sd-name { font-family: var(--font-editorial); font-weight: 500; font-size: 14px; line-height: 1.2; text-align: center; }
        .sd-state { color: var(--ink-60); }
        .sd-item.is-equipped .sd-state { color: var(--sisi-ink); }
        .sd-short { position: absolute; left: 4px; right: 4px; bottom: -16px; color: var(--ink-60); }
        .sd-note { margin: 20px 0 0; text-align: center; }
      `}</style>
    </FocusPaper>
  );
}
