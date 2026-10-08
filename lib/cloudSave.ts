/**
 * lib/cloudSave — no sign-up, nothing lost.
 *
 * The phone stays the source of truth (everything still lives in
 * localStorage, as before). Behind it, quietly:
 *   1. an anonymous account (Supabase Anonymous Sign-Ins) — its key is kept
 *      on the phone, so every launch is the same person, with no login
 *   2. a backup of what the person keeps (KEPT below), pushed a moment after
 *      anything changes, and when the app goes to the background
 *   3. a restore when this phone's storage is empty (reinstall, cleared data)
 * Linking Apple / email later keeps the same account (the backup follows).
 *
 * Off unless NEXT_PUBLIC_SISI_SYNC=on (and the device_state table from
 * supabase/migrations/007_device_state.sql exists). Never blocks the app:
 * any failure simply leaves the phone's copy as it is.
 */

import { createClient } from "@/lib/supabase/client";

export const CLOUD_SAVE = process.env.NEXT_PUBLIC_SISI_SYNC === "on";

/** what a person keeps (not caches, timers or debug switches) */
const KEPT = [
  "sisi:stars",
  "sisi:moments-v1",
  "sisi:starlight-v1",
  "sisi:guest-name",
  "sisi:guest-onboarded",
  "sisi:satchel",
  "sisi:world",
  "sisi:world-discoveries",
  "sisi:path-gifts",
  "sisi:rested-stars",
  "sisi:star-visits",
  "sisi:visits-v1",
  "sisi:hints-v1",
  "sisi:conversation",
  "sisi:thoughts-kept",
  "sisi:moment-links",
  "sisi:haptics-pref",
  "sisi:weather-settings",
  "sisi-music-on",
];

const PUSH_AFTER_MS = 2000;
let userId: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastPushed = "";

function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of KEPT) {
    const v = localStorage.getItem(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

/** nothing kept on this phone yet (a fresh install, or cleared data) */
function phoneIsEmpty(): boolean {
  return !localStorage.getItem("sisi:stars") && !localStorage.getItem("sisi:moments-v1") && !localStorage.getItem("sisi:guest-name");
}

async function push() {
  if (!userId) return;
  const data = snapshot();
  const body = JSON.stringify(data);
  if (body === lastPushed) return;
  try {
    const { error } = await createClient()
      .from("device_state")
      .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
    if (!error) lastPushed = body;
  } catch {
    // offline: the next change (or the next launch) tries again
  }
}

function schedulePush() {
  clearTimeout(timer);
  timer = setTimeout(push, PUSH_AFTER_MS);
}

/**
 * Start once, early (app/layout). Returns true when the phone was restored
 * from the backup (the caller reloads, so every screen reads it fresh).
 */
export async function startCloudSave(): Promise<boolean> {
  if (!CLOUD_SAVE || typeof window === "undefined") return false;
  const supabase = createClient();

  // 1 · the same person on every launch, without a login
  try {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id ?? null;
    if (!userId) {
      const { data: anon, error } = await supabase.auth.signInAnonymously();
      if (error) return false;
      userId = anon.user?.id ?? null;
    }
  } catch {
    return false;
  }
  if (!userId) return false;

  // 3 · an empty phone: bring back what was kept
  // (only a backup with something real in it — Stars, Moments or a name — and
  // only once per session, so a restore can never loop)
  let restored = false;
  if (phoneIsEmpty() && !sessionStorage.getItem("sisi:restored")) {
    try {
      const { data } = await supabase.from("device_state").select("data").eq("user_id", userId).maybeSingle();
      const kept = (data?.data ?? null) as Record<string, string> | null;
      if (kept && (kept["sisi:stars"] || kept["sisi:moments-v1"] || kept["sisi:guest-name"])) {
        sessionStorage.setItem("sisi:restored", "1");
        for (const [k, v] of Object.entries(kept)) if (KEPT.includes(k)) localStorage.setItem(k, v);
        lastPushed = JSON.stringify(snapshot());
        restored = true;
      }
    } catch {
      // nothing to restore
    }
  }

  // 2 · back up a moment after anything kept changes, and when leaving
  const setItem = Storage.prototype.setItem;
  const removeItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k: string, v: string) {
    setItem.call(this, k, v);
    if (this === localStorage && KEPT.includes(k)) schedulePush();
  };
  Storage.prototype.removeItem = function (k: string) {
    removeItem.call(this, k);
    if (this === localStorage && KEPT.includes(k)) schedulePush();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearTimeout(timer);
      push();
    }
  });
  if (!restored) schedulePush(); // the first backup of what is already here

  return restored;
}
