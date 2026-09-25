/**
 * lib/worldHandoff — keeps the one world continuous across routes.
 *
 * Journey (/journey) and Moments (/gallery) are separate pages that draw the
 * same sky, meadow and Sísí. Before one hands over to the other it plays its
 * own in-world exit, then leaves a note here: where the meadow is (ground
 * offset, in px of ground travel) and who is arriving. The next page reads it
 * on mount and starts from exactly that frame — no page slide, no fade to
 * black, no jump in the grass.
 *
 * In memory only (client navigation keeps modules alive); a hard reload
 * simply arrives normally.
 */

export type WorldTab = "journey" | "moments";
export type Handoff = {
  to: WorldTab;
  ground: number;
  at: number;
  /** "stars": arriving down through the Cloud Gate (not from the Journey) */
  via?: "stars";
  /** performance.now() at which the shared camera curve started */
  t0?: number;
  reduced?: boolean;
};

let pending: Handoff | null = null;
const MAX_AGE_MS = 4000;

export function handOff(to: WorldTab, ground: number, extra?: Pick<Handoff, "via" | "t0" | "reduced">) {
  pending = { to, ground, at: Date.now(), ...extra };
}

/* The last Moment in view, remembered for this app session (memory only),
   so coming back down from the Stars lands where the user left off. */
let lastMomentKey: string | null = null;
export const rememberMoment = (key: string | null) => {
  lastMomentKey = key;
};
export const lastMoment = () => lastMomentKey;

/** Read (without consuming — safe under StrictMode double renders). */
export function readHandoff(to: WorldTab): Handoff | null {
  if (!pending || pending.to !== to || Date.now() - pending.at > MAX_AGE_MS) return null;
  return pending;
}

export function clearHandoff() {
  pending = null;
}

/** Sísí's screen anchor in the Journey (matches --companion-x: 37%). */
export const JOURNEY_FOX_X = 0.37;
