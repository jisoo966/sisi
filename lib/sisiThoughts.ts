/**
 * lib/sisiThoughts — "A thought for your walk".
 *
 * An approved, local collection of ORIGINAL Sísí writing (no quotations, no
 * model generation on load). Gentle, honest, hopeful without promises; never
 * "you can achieve anything", never "believe and it will happen".
 *
 * Where they appear (sparingly):
 *   - some days, on the first Journey visit of the day — as a tiny star near
 *     Sísí that the user may open (never a modal)
 *   - now and then after a Star check-in
 * "Keep this" saves the exact words once as a Moment (source sisi_note,
 * type companion_note — shown as "A note from Sísí").
 *
 * If real quotations are ever added, they must be short, credited (author +
 * work), clearly marked as quotations, and properly licensed — never shown as
 * Sísí's own words.
 */

export type Thought = { id: string; text: string };

export const THOUGHTS: Thought[] = [
  { id: "t01", text: "You don’t need to see the whole path to keep walking." },
  { id: "t02", text: "A wish can be quiet and still be alive." },
  { id: "t03", text: "Small actions are how a distant life begins to feel familiar." },
  { id: "t04", text: "You can hold hope without forcing certainty." },
  { id: "t05", text: "You sound tired, not incapable. Today’s step is allowed to be smaller." },
  { id: "t06", text: "Some days the walking is the whole point." },
  { id: "t07", text: "Noticing one good thing doesn’t erase the hard ones. It just keeps you company." },
  { id: "t08", text: "A slow week is still a week you stayed." },
  { id: "t09", text: "You can change the pace without changing the direction." },
  { id: "t10", text: "What you care about is allowed to take its time." },
  { id: "t11", text: "Rest is part of the path, not a detour from it." },
  { id: "t12", text: "It’s all right if today only held a small piece of what you hope for." },
  { id: "t13", text: "The life you want is made of ordinary days, too." },
  { id: "t14", text: "You don’t have to feel ready to take a very small step." },
  { id: "t15", text: "Coming back after a while away is still coming back." },
  { id: "t16", text: "Hope doesn’t have to be loud to be real." },
  { id: "t17", text: "A wish is not a test you can fail. It’s a direction you can return to." },
  { id: "t18", text: "Being gentle with yourself is not the same as giving up." },
  { id: "t19", text: "Sometimes the most honest step is simply to notice where you are." },
  { id: "t20", text: "Not knowing how it ends is not the same as it not mattering." },
];

const DAY_KEY = "sisi:thought-day"; // { date, id, done }
const KEPT_KEY = "sisi:thoughts-kept"; // ids already kept as Moments
const LAST_KEY = "sisi:thought-last"; // recent ids, to avoid repeats

const today = () => new Date().toLocaleDateString("en-CA");
const hash = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
function read<T>(k: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

/** Pick a thought not shown recently (and remember it). */
function pickFresh(): Thought {
  const recent: string[] = read(LAST_KEY, []);
  const pool = THOUGHTS.filter((t) => !recent.includes(t.id));
  const list = pool.length ? pool : THOUGHTS;
  const t = list[Math.floor(Math.random() * list.length)];
  localStorage.setItem(LAST_KEY, JSON.stringify([t.id, ...recent].slice(0, 8)));
  return t;
}

/**
 * Today's thought for the Journey, or null. Only on some days (about two in
 * three), and once it has been opened, kept or dismissed it stays away until
 * tomorrow.
 */
export function thoughtForToday(): Thought | null {
  if (typeof window === "undefined") return null;
  const d = today();
  const forced = localStorage.getItem("sisi:thought-force") === "1"; // testing only
  if (!forced && hash(d) % 3 === 0) return null; // not every day
  const state = read<{ date: string; id: string; done?: boolean } | null>(DAY_KEY, null);
  if (state && state.date === d) {
    if (state.done) return null;
    return THOUGHTS.find((t) => t.id === state.id) ?? null;
  }
  const t = pickFresh();
  localStorage.setItem(DAY_KEY, JSON.stringify({ date: d, id: t.id }));
  return t;
}

/** The user opened / kept / dismissed today's thought — done for today. */
export function finishTodaysThought() {
  const state = read<{ date: string; id: string } | null>(DAY_KEY, null);
  if (state) localStorage.setItem(DAY_KEY, JSON.stringify({ ...state, done: true }));
}

/** Now and then after a Star check-in (about one in three). */
export function thoughtAfterCheckIn(): Thought | null {
  if (typeof window === "undefined" || Math.random() > 0.34) return null;
  return pickFresh();
}

export function isKept(id: string): boolean {
  return read<string[]>(KEPT_KEY, []).includes(id);
}
export function markKept(id: string) {
  const kept = read<string[]>(KEPT_KEY, []);
  if (!kept.includes(id)) localStorage.setItem(KEPT_KEY, JSON.stringify([...kept, id]));
}
