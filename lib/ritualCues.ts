"use client";

/**
 * lib/ritualCues — optional sound and haptics for Picture it.
 * Both are OFF unless the person turns them on (remembered on this device).
 *   sound    one soft two-note tone (Web Audio, very low volume, no files)
 *   haptics  one short, light vibration where supported
 */

export type RitualPrefs = { sound: boolean; haptics: boolean };
const KEY = "sisi:ritual-prefs";

export function loadRitualPrefs(): RitualPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { sound: v.sound === true, haptics: v.haptics === true };
  } catch {
    return { sound: false, haptics: false };
  }
}
export function saveRitualPrefs(p: RitualPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}
export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

let ctx: AudioContext | null = null;
/** Call from the "I'm ready" tap so browsers allow the sound later. */
export function primeSound() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ctx && AC) ctx = new AC();
    void ctx?.resume();
  } catch {
    ctx = null;
  }
}

/** a soft cue: "in" rises a little, "out" settles, "soft" is a single low tone */
export function ritualCue(kind: "in" | "out" | "soft", prefs: RitualPrefs) {
  if (prefs.haptics && canVibrate()) navigator.vibrate(kind === "soft" ? 12 : 18);
  if (!prefs.sound || !ctx) return;
  const now = ctx.currentTime;
  const notes = kind === "in" ? [392, 523.25] : kind === "out" ? [523.25, 392] : [440];
  notes.forEach((f, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = "sine";
    o.frequency.value = f;
    const t = now + i * 0.45;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g).connect(ctx!.destination);
    o.start(t);
    o.stop(t + 2.5);
  });
}
