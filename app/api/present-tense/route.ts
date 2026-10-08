import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * /api/present-tense — "Help me phrase it" (only when the person asks)
 *   POST { wish } → { line: string | null }
 *
 * Sísí offers a clearer, warmer wording of the wish, in their own words —
 * as if it is already on its way. It never claims a feeling they may not
 * have yet ("happy" does not become "I am happy."). line is null when the
 * words already say it well, or when nothing could be made.
 */

const SYSTEM = `You help someone name a wish for a gentle manifestation app. They wrote a few words; offer ONE clearer, warmer wording of the same wish.

- keep their meaning and their own words as much as possible; add no new places, people or details
- it may be a short name for the wish ("A home by the sea") or, when it reads naturally, a first-person sentence as if it is already true or on its way ("I live by the sea.")
- never state a feeling as already true when it is the very thing they are wishing for: "happy" → "A life that feels light and happy", not "I am happy."
- the same language as the wish
- sentence case, at most 12 words, no quotes, no emoji, no exclamation marks
- if their words are already clear and warm, return exactly: SAME

Return only the wording (or SAME).`;

export async function POST(req: Request) {
  try {
    const { wish } = (await req.json()) as { wish?: string };
    const w = (wish ?? "").trim().slice(0, 200);
    if (!w || !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ line: null });

    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 80,
      system: SYSTEM,
      messages: [{ role: "user", content: w }],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim().replace(/^["“]|["”]$/g, "");
    if (!text || text === "SAME" || same(text, w)) return NextResponse.json({ line: null });
    return NextResponse.json({ line: text });
  } catch (err) {
    console.error("present-tense:", err);
    return NextResponse.json({ line: null });
  }
}

/** the same words, apart from case and a final period */
function same(a: string, b: string) {
  const n = (s: string) => s.toLowerCase().replace(/[.!?。\s]+$/, "").trim();
  return n(a) === n(b);
}
