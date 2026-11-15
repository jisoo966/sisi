"use client";

/**
 * Gifts unlocked on this device by a gift letter (/gift/<code>).
 * Stored as "sisi:gifts" (a list), backed up with the rest (lib/cloudSave).
 */
const KEY = "sisi:gifts";
export const GIFTS_EVENT = "sisi:gifts-change";

export function hasGift(id: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}

export function unlockGift(id: string): void {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    if (!list.includes(id)) localStorage.setItem(KEY, JSON.stringify([...list, id]));
  } catch {}
  window.dispatchEvent(new CustomEvent(GIFTS_EVENT, { detail: id }));
}
