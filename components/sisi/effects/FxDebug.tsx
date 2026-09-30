"use client";

import { useEffect, useState } from "react";
import { emitFx, softGlint, type AmbientKind } from "@/lib/fx";
import { anchorPoint, safeBounds, type Bounds, type Pt } from "@/lib/fxAnchors";
import type { FxDebugInfo } from "./EffectsHost";

/**
 * FxDebug — development only (never bundled for production: EffectsHost
 * imports it behind `process.env.NODE_ENV !== "production"`).
 *
 * Turn on with ?fxdebug=1 (remembered for the tab), off with ?fxdebug=0.
 * Shows the viewport and safe-area outlines, the live anchors (selected
 * Star · Sísí · Starlight counter), the last effect's start / end points
 * and bounding box, and buttons to play each effect.
 */

const KEY = "sisi:fx-debug";
const AMBIENTS: AmbientKind[] = ["firefly", "petal", "grass", "dust", "shooting"];

export default function FxDebug() {
  const [on, setOn] = useState(false);
  const [b, setB] = useState<Bounds | null>(null);
  const [anchors, setAnchors] = useState<Record<string, Pt | null>>({});
  const [last, setLast] = useState<FxDebugInfo | null>(null);
  const [amb, setAmb] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("fxdebug");
    try {
      if (q === "1") sessionStorage.setItem(KEY, "1");
      if (q === "0") sessionStorage.removeItem(KEY);
      setOn(sessionStorage.getItem(KEY) === "1");
    } catch {
      setOn(q === "1");
    }
  }, []);

  useEffect(() => {
    if (!on) return;
    const read = () => {
      setB(safeBounds());
      setAnchors({ selectedStar: anchorPoint("selectedStar"), sisi: anchorPoint("sisi"), starlightCounter: anchorPoint("starlightCounter") });
    };
    read();
    const t = setInterval(read, 500); // debug overlay only
    const h = (e: Event) => setLast((e as CustomEvent<FxDebugInfo>).detail);
    window.addEventListener("sisi:fx-debug", h);
    return () => {
      clearInterval(t);
      window.removeEventListener("sisi:fx-debug", h);
    };
  }, [on]);

  if (!on || !b) return null;
  const dot = (p: Pt | null | undefined, color: string, label: string) =>
    p ? (
      <span className="fxd-dot" style={{ left: p.x, top: p.y, borderColor: color }}>
        <span className="fxd-label" style={{ color }}>{label}</span>
      </span>
    ) : null;

  return (
    <div className="fxd">
      <div className="fxd-viewport" />
      <div className="fxd-safe" style={{ left: b.left, top: b.top, width: b.right - b.left, height: b.bottom - b.top }} />
      {dot(anchors.selectedStar, "#f1c45e", "selectedStar")}
      {dot(anchors.sisi, "#ee684e", "sisi")}
      {dot(anchors.starlightCounter, "#8fd3ff", "counter")}
      {last?.box && <div className="fxd-box" style={{ left: last.box.x, top: last.box.y, width: last.box.w, height: last.box.h }} />}
      {dot(last?.start, "#7CFC9A", "start")}
      {dot(last?.end, "#ff7cf0", "end")}
      <div className="fxd-panel">
        <p className="fxd-status">
          {last ? `${last.kind}${last.skipped ? ` — skipped: ${last.skipped}` : ""}` : "no effect yet"}
        </p>
        <button type="button" onClick={(e) => softGlint(e.currentTarget)}>Test Soft Glint</button>
        <button type="button" onClick={() => emitFx({ kind: "trail", amount: 1 })}>Test Starlight Trail</button>
        <button type="button" onClick={() => emitFx({ kind: "birth", anchor: "selectedStar" })}>Test Star Birth</button>
        <button type="button" onClick={() => emitFx({ kind: "bloom" })}>Test Fulfilled Bloom</button>
        <button
          type="button"
          onClick={() => {
            emitFx({ kind: "ambient", variant: AMBIENTS[amb % AMBIENTS.length] });
            setAmb((n) => n + 1);
          }}
        >
          Test Ambient Magic ({AMBIENTS[amb % AMBIENTS.length]})
        </button>
      </div>
      <style jsx global>{`
        .fxd { position: absolute; inset: 0; pointer-events: none; font: 11px/1.3 ui-monospace, monospace; }
        .fxd-viewport { position: absolute; inset: 0; outline: 2px dashed rgba(255, 90, 90, 0.8); outline-offset: -2px; }
        .fxd-safe { position: absolute; outline: 1px dashed rgba(124, 252, 154, 0.9); }
        .fxd-box { position: absolute; outline: 1px solid rgba(255, 124, 240, 0.9); }
        .fxd-dot { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border: 2px solid; border-radius: 50%; }
        .fxd-label { position: absolute; left: 14px; top: -3px; white-space: nowrap; text-shadow: 0 0 3px #000; }
        .fxd-panel {
          position: absolute; left: 8px; top: 30%; display: flex; flex-direction: column; gap: 4px; pointer-events: auto;
          padding: 6px; background: rgba(0, 0, 0, 0.6); border-radius: 6px; max-width: 170px;
        }
        .fxd-panel button { all: unset; cursor: pointer; padding: 4px 6px; color: #fff; background: rgba(255, 255, 255, 0.14); border-radius: 4px; }
        .fxd-status { margin: 0 0 2px; color: #ffe08a; }
      `}</style>
    </div>
  );
}
