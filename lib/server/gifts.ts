import { createHash } from "crypto";

/**
 * Gifts for one person — a thank-you note that unlocks something on their
 * walk. Given to an account (a guest's anonymous account counts), checked on
 * the server: only the SHA-256 of the account id lives here, and the note is
 * sent only to that account.
 */
export type GiftId = "fern";

export type GiftNote = {
  gift: GiftId;
  /** paragraphs of the note */
  body: string[];
  /** signature */
  from: string;
};

const NOTES: Record<string, GiftNote> = {
  // Won — the one who has walked with Sísí the most (Oct–Nov 2026)
  "34698d85a20d1563679ae9b6b64ff2db6b8118c199f813ac5f4856b0ea3ac8d2": {
    gift: "fern",
    body: [
      "Won, you’ve walked here more than anyone.",
      "Every moment you kept made this place a little warmer. Thank you.",
      "So here’s a friend for the road.",
    ],
    from: "Jisoo & Sísí",
  },
};

export function noteForUser(userId: string): GiftNote | null {
  const h = createHash("sha256").update(userId).digest("hex");
  return NOTES[h] ?? null;
}

/** development only: the first note, to look at it */
export function previewNote(): GiftNote | null {
  return Object.values(NOTES)[0] ?? null;
}
