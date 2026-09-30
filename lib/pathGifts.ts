/**
 * lib/pathGifts — small things that appear along the Journey because of
 * something that happened with a Star (e.g. a fulfilled Star leaves one
 * small new flower). Each is revealed once, on the next unobstructed
 * return to the Journey, and then counted as part of the path.
 */

const KEY = "sisi:path-gifts";
type Gift = { id: string; kind: "fulfilled-flower"; starId: string; state: "pending" | "shown"; at: string };

function read(): Gift[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function write(g: Gift[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    // ignore
  }
}

export function addFulfilledFlower(starId: string) {
  const g = read();
  if (g.some((x) => x.kind === "fulfilled-flower" && x.starId === starId)) return;
  g.push({ id: `flower-${starId}`, kind: "fulfilled-flower", starId, state: "pending", at: new Date().toISOString() });
  write(g);
}
export function nextPathGift(): Gift | null {
  return read().find((g) => g.state === "pending") ?? null;
}
export function markGiftShown(id: string) {
  write(read().map((g) => (g.id === id ? { ...g, state: "shown" } : g)));
}
/** how many flowers now live along the path */
export function fulfilledFlowers(): number {
  return read().filter((g) => g.kind === "fulfilled-flower" && g.state === "shown").length;
}
