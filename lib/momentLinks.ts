/**
 * lib/momentLinks — which Star a photo Moment belongs to.
 *
 * A photo Moment is stored as a postcard (image + words) and its words are
 * also added to the Star's timeline as a sign. This small map remembers that
 * pairing so the Memory Trail shows it once (as the photo), linked to its Star.
 * Device-local; small and safe to lose (the moment and the sign both remain).
 */

type Link = { starId: string; signId?: string };
const KEY = "sisi:moment-links";

function read(): Record<string, Link> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function linkMoment(postcardId: string, starId: string, signId?: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [postcardId]: { starId, signId } }));
  } catch {
    // ignore
  }
}

export function momentLinks(): Record<string, Link> {
  return read();
}
