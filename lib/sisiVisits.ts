/**
 * lib/sisiVisits — when Sísí may come by with a little note (Angel Messages).
 *
 * Asked once, in her own words, after the first walk together ("Can I visit
 * you with a little note sometimes?"); the system permission is requested
 * only after a yes, and a time chosen. Kept on this device for now; the
 * push itself (OneSignal) joins once accounts are in place.
 */

export type VisitTime = "morning" | "evening";
export type Visits = { asked: true; time: VisitTime | null; allowed: boolean; at: string };

const KEY = "sisi:visits-v1";

export function visitsAsked(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return true; // never ask when we can't remember the answer
  }
}

export function readVisits(): Visits | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

function keep(v: Visits) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

/** "Not now": asked, and left at that (Sísí never asks twice) */
export function declineVisits() {
  keep({ asked: true, time: null, allowed: false, at: new Date().toISOString() });
}

/** a yes and a time: only now the system asks for notifications */
export async function allowVisits(time: VisitTime): Promise<boolean> {
  let allowed = false;
  try {
    if (typeof Notification !== "undefined") {
      const p = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      allowed = p === "granted";
    }
  } catch {
    allowed = false;
  }
  keep({ asked: true, time, allowed, at: new Date().toISOString() });
  return allowed;
}
