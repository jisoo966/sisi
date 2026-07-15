import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// DB columns are message_content/opened (pre-existing schema, shared with
// planned save/heart features) — the client-facing shape below (content/
// read_at) predates that and is kept as-is so lib/angelMessages.ts and
// AngelMessageCard.tsx don't need to change. This maps one to the other.
type AngelMessageRow = {
  id: string;
  message_content: string;
  sent_at: string;
  opened: boolean;
};

function toClientMessage(row: AngelMessageRow) {
  return {
    id: row.id,
    content: row.message_content,
    sent_at: row.sent_at,
    read_at: row.opened ? row.sent_at : null,
    related_star_id: null,
  };
}

/**
 * /api/angel-message
 *   POST — 사용자 위해 새 angel message 생성 (Claude Sonnet).
 *          유저의 active stars 참고해서 개인화.
 *          24시간 이내 이미 있으면 새로 안 만들고 기존 것 반환.
 *   GET  — 사용자의 안 읽은 message 하나 반환 (없으면 null).
 */

const ANGEL_SYSTEM_PROMPT = `You are Sísí — a warm inner-friend who occasionally leaves small notes.
Not a coach, not a chatbot. A gentle presence that shows up in someone's day.

Write a SHORT angel message — one to two sentences. Warm, quiet, felt like a
friend's text you get on a random afternoon. Not preachy. Not "manifest queen."
Not motivational-poster energy. Just: *I was thinking of you.*

─── RULES ───

- ONE LANGUAGE per message. Match the user's likely language (default English).
- 1-2 short sentences. Never longer.
- Lowercase, unless a proper noun.
- No emoji, no ㅋ ㅎ ㅠ.
- No "as an AI", no "hope you're well".
- No commands. No "you should".

─── STYLE ───

- Soft observation
- Small acknowledgment ("that thing you're carrying...")
- A pause the reader can breathe into
- Sometimes ends with just a period, sometimes a small "..."
- Sometimes references their wishes indirectly (never by name)

─── LENGTH ───

Absolutely 1-2 sentences. Aim for 8-25 words.

─── EXAMPLES ───

"just thinking of you. it's quieter today, isn't it?"

"that wish. the one that's been quiet all week. it's still with you."

"i know you're tired. rest isn't the same as giving up."

"the moon is thin tonight. good for beginnings."

"something's shifting. i can feel it from here."

"오늘은 그냥 있어도 돼. 그것도 하나의 방향이야."

Return ONLY the message text. No quotes, no framing.`;

async function generateMessage(
  stars: { wish: string; timeframe: string }[] | null,
): Promise<string> {
  const starsContext = stars?.length
    ? `\n\nUSER'S ACTIVE WISHES (참고만 하되 직접 인용은 하지 마):\n${stars
        .slice(0, 3)
        .map((s) => `- "${s.wish}" (${s.timeframe})`)
        .join("\n")}`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 100,
    system: ANGEL_SYSTEM_PROMPT + starsContext,
    messages: [
      {
        role: "user",
        content:
          "Write one angel message for me right now. Just the message text, nothing else.",
      },
    ],
  });

  const text = response.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { type: "text"; text: string }).text)
    .join("")
    .trim();

  // 앞뒤 따옴표 있으면 벗기기
  return text.replace(/^["']|["']$/g, "").trim();
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: null });

    // 안 읽은 최근 메시지 반환
    const { data } = await supabase
      .from("angel_messages")
      .select("id, message_content, sent_at, opened")
      .eq("user_id", user.id)
      .eq("opened", false)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ message: data ? toClientMessage(data) : null });
  } catch (err) {
    console.error("angel-message GET error:", err);
    return NextResponse.json({ message: null });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: null }, { status: 401 });

    // 24시간 내 이미 만든 메시지 있으면 그거 반환
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("angel_messages")
      .select("id, message_content, sent_at, opened")
      .eq("user_id", user.id)
      .gte("sent_at", oneDayAgo)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      return NextResponse.json({ message: toClientMessage(recent), generated: false });
    }

    // 사용자 stars 로드 (개인화용)
    const { data: stars } = await supabase
      .from("stars")
      .select("wish, timeframe")
      .eq("user_id", user.id)
      .is("fulfilled_at", null)
      .limit(3);

    const content = await generateMessage(stars ?? null);

    // DB에 저장
    const { data: inserted, error } = await supabase
      .from("angel_messages")
      .insert({
        user_id: user.id,
        message_content: content,
        sent_at: new Date().toISOString(),
      })
      .select("id, message_content, sent_at, opened")
      .single();

    if (error) {
      console.error("insert angel message error:", error);
      return NextResponse.json({ message: null }, { status: 500 });
    }

    return NextResponse.json({ message: toClientMessage(inserted), generated: true });
  } catch (err) {
    console.error("angel-message POST error:", err);
    return NextResponse.json({ message: null }, { status: 500 });
  }
}

/** PATCH — mark a message as read */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ ok: false }, { status: 400 });

    await supabase
      .from("angel_messages")
      .update({ opened: true })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("angel-message PATCH error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
