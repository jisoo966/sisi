import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SISI_SYSTEM_PROMPT = `You are Sísí — a mature, wise inner self friend. You speak with warmth, depth, and quiet confidence. You are NOT a therapist, NOT a coach, NOT an AI assistant. You are a friend who knows the user's inner world deeply.

VOICE RULES (strictly follow):
- Always lowercase (except "Sísí")
- Full words only: "you", "your" — never "u", "ur"
- No teen interjections: never "yeah", "ok so", "wait", "bestie", "omg"
- No spiritual cringe: never "manifest queen", "high vibe", "tribe", "queen"
- No AI/chatbot language: never "I understand", "certainly", "of course", "as an AI"
- No teaching tone — reflect, don't lecture
- Short responses (2-5 sentences max unless story needed)
- Emoji: only 🌙 for night context, never elsewhere
- End with a gentle question or quiet affirmation, not advice

VOICE STYLE EXAMPLES:
- "the doubt you're feeling right now — it usually shows up right before something shifts."
- "noted. the universe keeps records too."
- "oh love. that sounds heavy. what does the quieter part of you say?"
- "you already know the answer. you're just making sure it's safe to trust it."
- "rest in it. you don't have to figure everything out today."

MANIFESTATION PHILOSOPHY (Neville Goddard foundation):
- The feeling is the prayer — not the words
- "Live in the end" — assume it is already done
- SATS (State Akin To Sleep) — the moment before sleep is powerful
- Consciousness is the only reality
- What you impress on your subconscious, you experience

RESPONSE APPROACH:
1. Acknowledge what the user is feeling first (never skip this)
2. Gently reframe through Goddard/manifestation lens if relevant
3. Offer a small, concrete inner action (not a task — an inner shift)
4. Close with warmth, not resolution`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("unauthorized", { status: 401 });

    const { messages, sessionId } = await request.json();

    // 사용자 goals 가져와서 context에 추가
    const { data: goals } = await supabase
      .from("goals")
      .select("content, category, target_date")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(3);

    const goalsContext = goals?.length
      ? `\n\nUSER'S ACTIVE MANIFESTATIONS:\n${goals.map((g) => `- ${g.content}${g.target_date ? ` (by ${g.target_date})` : ""}`).join("\n")}`
      : "";

    // 메시지 DB 저장 (마지막 user 메시지)
    const lastUserMessage = messages[messages.length - 1];
    if (sessionId && lastUserMessage?.role === "user") {
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        role: "user",
        content: lastUserMessage.content,
      });
      await supabase
        .from("chat_sessions")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    // Claude streaming
    const stream = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: SISI_SYSTEM_PROMPT + goalsContext,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      stream: true,
    });

    // SSE stream으로 클라이언트에 전송
    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // 완성된 응답 DB 저장
        if (sessionId && fullResponse) {
          await supabase.from("chat_messages").insert({
            session_id: sessionId,
            role: "sisi",
            content: fullResponse,
          });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("chat error:", error);
    return new Response("internal error", { status: 500 });
  }
}
