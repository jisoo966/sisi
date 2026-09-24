"use client";

import { AnimatePresence, motion } from "framer-motion";
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
import { tornEdge } from "@/lib/tornEdge";

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
const EDGE = tornEdge(21);

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
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="sd-backdrop"
            type="button"
            aria-label="Close satchel"
            className="sd-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            key="sd-drawer"
            className="sd-drawer"
            role="dialog"
            aria-label="Satchel"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "115%", transition: { duration: 0.35 } }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="sd-shadow" aria-hidden />
            <div className="sd-paper paper-bg">
              <span className="sd-handle" aria-hidden />
              <div className="sd-head">
                <div className="sd-tabs" role="tablist">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.key}
                      className={`sd-tab${tab === t.key ? " is-active" : ""}`}
                      onClick={() => setTab(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <span className="sd-balance" aria-label={`${balance ?? 0} Little Lights`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/sisi-star-mark-painted-512.png" alt="" /> {balance ?? "·"}
                </span>
              </div>

              <div className="sd-grid">
                {items.map((item) => {
                  const owned = state?.owned.has(item.id) ?? item.cost === 0;
                  const equipped = state?.equipped[item.category] === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`sd-item${equipped ? " is-equipped" : ""}`}
                      onClick={() => pick(item)}
                    >
                      <span className="sd-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.preview} alt="" />
                      </span>
                      <span className="sd-name">{item.name}</span>
                      <span className="sd-state">
                        {equipped ? "Equipped" : owned ? "Owned" : `✦ ${item.cost}`}
                      </span>
                      {short === item.id && <span className="sd-short">a few more Lights</span>}
                    </button>
                  );
                })}
              </div>
              <p className="sd-note">More will find their way into your satchel along the journey.</p>
            </div>
          </motion.div>

          <style jsx global>{`
            .sd-backdrop {
              position: absolute; inset: 0; z-index: 24; border: 0; padding: 0;
              background: rgba(12, 20, 38, 0.08); pointer-events: auto;
            }
            .sd-drawer {
              position: absolute;
              left: max(12px, var(--safe-left));
              right: max(12px, var(--safe-right));
              bottom: calc(var(--safe-bottom) + 12px);
              z-index: 25;
              pointer-events: auto;
            }
            .sd-shadow {
              position: absolute; inset: 12px 6px -6px 6px; border-radius: 12px;
              background: rgba(0, 0, 0, 0.35); filter: blur(14px);
            }
            .sd-paper {
              position: relative; padding: 24px 18px 18px; clip-path: ${EDGE}; color: #2b2f45;
            }
            .sd-handle {
              position: absolute; top: 9px; left: 50%; width: 34px; height: 3px; margin-left: -17px;
              border-radius: 3px; background: rgba(43, 47, 69, 0.18);
            }
            .sd-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
            .sd-tabs { display: flex; gap: 18px; }
            .sd-tab {
              border: 0; background: transparent; padding: 4px 0;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px;
              color: rgba(43, 47, 69, 0.55); border-bottom: 1.5px solid transparent; cursor: pointer;
            }
            .sd-tab.is-active { color: #2b2f45; border-bottom-color: #3d74d8; }
            .sd-balance {
              display: inline-flex; align-items: center; gap: 5px;
              font-family: var(--font-fraunces), Georgia, serif; font-size: 16px;
            }
            .sd-balance img { width: 18px; height: 18px; }
            .sd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .sd-item {
              position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
              padding: 8px 6px 8px; border-radius: 12px; border: 1px solid rgba(43, 47, 69, 0.1);
              background: rgba(255, 255, 255, 0.45); cursor: pointer;
            }
            .sd-item.is-equipped { border-color: #3d74d8; box-shadow: 0 0 0 1px #3d74d8 inset; }
            .sd-thumb {
              width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden;
              background: #4384e3; display: flex; align-items: center; justify-content: center;
            }
            .sd-thumb img { width: 100%; height: 100%; object-fit: cover; }
            .sd-name { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 13px; }
            .sd-state { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 12px; color: rgba(43, 47, 69, 0.6); }
            .sd-item.is-equipped .sd-state { color: #3d74d8; }
            .sd-short {
              position: absolute; left: 4px; right: 4px; bottom: -18px; font-size: 11px; font-style: italic;
              color: rgba(43, 47, 69, 0.6); font-family: var(--font-eb-garamond), Georgia, serif;
            }
            .sd-note {
              margin: 16px 0 0; text-align: center; font-family: var(--font-eb-garamond), Georgia, serif;
              font-style: italic; font-size: 13px; color: rgba(43, 47, 69, 0.55);
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
