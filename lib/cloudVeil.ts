/**
 * The cloud veil — one descent that spans two pages.
 *
 * Onboarding's "Begin my journey" calls coverWithClouds(): the cloud banks
 * rise from below until they fill the screen. The page then changes to the
 * Journey underneath them, and the Journey calls liftClouds() once it is
 * drawn: the clouds keep rising and leave through the top, so it feels like
 * coming down through them onto the meadow. (CloudVeil is mounted in the
 * root layout, so it lives through the page change.)
 */

export type VeilState = "none" | "covering" | "covered" | "lifting";

let state: VeilState = "none";
const listeners = new Set<(s: VeilState) => void>();

/** how long the clouds take to fill the screen (ms) */
export const VEIL_COVER_MS = 1700;
/** how long they take to leave through the top (ms) */
export const VEIL_LIFT_MS = 1800;

function set(s: VeilState) {
  state = s;
  listeners.forEach((l) => l(s));
}

export function veilState(): VeilState {
  return state;
}

export function onVeil(l: (s: VeilState) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The clouds rise and fill the screen; resolves once nothing else shows. */
export function coverWithClouds(): Promise<void> {
  set("covering");
  return new Promise((resolve) =>
    setTimeout(() => {
      set("covered");
      resolve();
      // never left covering the app if the next page doesn't lift them
      setTimeout(() => state === "covered" && liftClouds(), 5000);
    }, VEIL_COVER_MS),
  );
}

/** The clouds carry on upwards and leave (only when they are covering). */
export function liftClouds(): void {
  if (state !== "covered" && state !== "covering") return;
  set("lifting");
  setTimeout(() => state === "lifting" && set("none"), VEIL_LIFT_MS + 50);
}
