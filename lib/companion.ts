"use client";

import { useEffect, useState } from "react";

/**
 * Which companion walks with you — Sísí, the white cat (default), or Fern,
 * the poodle. Chosen on the Map (first tab); stored on this device ("sisi:companion").
 *
 * Every companion has the same art layout, so the walking code doesn't change:
 *   sheet    6×5 = 30 frames, one 3.6s pass = 8 steps
 *   cell     648px wide, 26px of empty alpha under the paws (≈ 4.0%)
 *   idle     one standing frame at the same cell size
 */
export type CompanionId = "cat" | "poodle";

export type Companion = {
  id: CompanionId;
  label: string;
  /** standing pose (also the thumbnail) */
  idle: string;
  /** full-resolution walk sheet (Journey) */
  sheet: string;
  /** half-resolution walk sheet (Memory Trail) */
  sheetSmall: string;
  /** where the speak lines start, in front of the mouth — from the walker's
   *  centre and paw line, as a share of its width (facing right) */
  mouth: { x: number; y: number };
};

export const COMPANIONS: Record<CompanionId, Companion> = {
  cat: {
    id: "cat",
    label: "Sísí",
    idle: "/V2/fox-walk/fox-walk-preview.webp",
    sheet: "/V2/fox-walk/fox-walk-sprite30-full.webp",
    sheetSmall: "/V2/fox-walk/fox-walk-sprite30.webp",
    mouth: { x: 0.45, y: 0.6 },
  },
  poodle: {
    id: "poodle",
    label: "Fern",
    idle: "/V2/poodle-walk/poodle-walk-preview.webp",
    sheet: "/V2/poodle-walk/poodle-walk-sprite30-full.webp",
    sheetSmall: "/V2/poodle-walk/poodle-walk-sprite30.webp",
    // her face is lower and rounder than Sísí's: the lines sit by her mouth
    mouth: { x: 0.42, y: 0.49 },
  },
};

const KEY = "sisi:companion";
const EVENT = "sisi:companion-change";

export function getCompanionId(): CompanionId {
  try {
    const v = localStorage.getItem(KEY);
    return v === "poodle" ? "poodle" : "cat";
  } catch {
    return "cat";
  }
}

export function setCompanionId(id: CompanionId): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

/** The chosen companion; follows changes made anywhere in the app. */
export function useCompanion(): Companion {
  const [id, setId] = useState<CompanionId>("cat");
  useEffect(() => {
    setId(getCompanionId());
    const on = () => setId(getCompanionId());
    window.addEventListener(EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return COMPANIONS[id];
}
