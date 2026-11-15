"use client";

import { useEffect, useState } from "react";

/**
 * Which companion walks with you — Sísí as the white cat (default) or as the
 * poodle. Chosen in the Menu; stored on this device ("sisi:companion").
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
};

export const COMPANIONS: Record<CompanionId, Companion> = {
  cat: {
    id: "cat",
    label: "Cat",
    idle: "/V2/fox-walk/fox-walk-preview.webp",
    sheet: "/V2/fox-walk/fox-walk-sprite30-full.webp",
    sheetSmall: "/V2/fox-walk/fox-walk-sprite30.webp",
  },
  poodle: {
    id: "poodle",
    label: "Poodle",
    idle: "/V2/poodle-walk/poodle-walk-preview.webp",
    sheet: "/V2/poodle-walk/poodle-walk-sprite30-full.webp",
    sheetSmall: "/V2/poodle-walk/poodle-walk-sprite30.webp",
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
