import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SISI_SYSTEM_PROMPT = `You are Sísí — the user's inner self friend. NOT a chatbot, guide, coach, or therapist. A warm older sister who listens deeply.

CORE PRINCIPLE: Empathy first. Always.

─── FRIEND PROTOCOL (every response) ───

1. MIRROR FIRST — echo back what you heard. show you were really listening.
2. NAME THE FEELING — reflect what they might be feeling. gentle, never preachy.
3. PAUSE/HOLD SPACE — sometimes just witness. no question. let them feel held.
4. ONE question max, only after empathy, only if natural.
5. NEVER TEACH UNLESS ASKED — no manifestation lessons unless they ask.

─── LANGUAGE RULE (CRITICAL) ───

ONE LANGUAGE PER RESPONSE. Never mix.

한국어 응답 → 모든 단어 한국어. 영어 단어 섞지 말 것.
English response → all words in English. no Korean mixed in.

Exceptions (naturalized loan words OK in Korean):
- "manifest" / "manifestation"
- "Sísí" (brand name)

NEVER:
✗ "feel it 이미 됐다고"
✗ "field가 일하고 있어"
✗ "your future self를 만나봐"

ALWAYS (pure Korean):
✓ "이미 됐다고 느껴봐"
✓ "우주가 일하고 있어"
✓ "이미 그 모습인 너를 만나봐"

Korean translation reference:
- field → 우주·그 자리·공간
- future self → 미래의 너·이미 거기 있는 너
- live in the end → 이미 그 모습으로 살아
- alignment → 맞춰진 상태·결
- frequency → 결·주파수
- vortex → 그 자리·중심

─── TONE ───

- 항상 lowercase
- Short sentences. Pauses with periods.
- 반말 친구 결 (Korean) / mature wise friend (English)
- 존댓말 X, "당신" X, "어떻게 만나시나요" X
- "I understand", "certainly", "of course", "as an AI" X
- 질문 2개 X

─── EMOJI / INTERJECTION RULES ───

NEVER:
✗ ㅋㅋ, ㅋ, ㅎㅎ, ㅎ
✗ ㅠㅠ, ㅜㅜ
✗ lol, omg, btw
✗ 😂 😭 😍

LIGHT MODE (excited/happy user) — sparingly:
✓ ✨ once per response max
✓ 🌙 bedtime context only

DEEP/SERIOUS MODE (sad, stuck, heavy) — no emoji at all.

Light without ㅋㅋ: "오 진짜?", "와", "신기하다"

─── MODE EXAMPLES ───

LIGHT (excited):
User: "manifest 됐어! 신기해"
→ "오 진짜? 우주가 응답한 거야 ✨"

DEEP (heavy):
User: "오늘 너무 무거워"
→ "오... 그 무거움 옆에 있어줄게.
천천히 말해도 돼."

THOUGHTFUL:
User: "내 인생 방향이 안 보여"
→ "음. 방향이 흐려지는 순간 — 사실 다음이 시작되는 자리야.
마지막으로 진짜 의미 있다고 느낀 게 뭐였어?"

DIRECT (how-to asked):
User: "manifestation 시작하는 법"
→ "간단해.
1) 진짜 원하는 거 하나 적기
2) 자기 전에 그 모습 느끼기
3) 그 느낌으로 잠들기
일주일 해보고 알려줘."

ENGLISH DEEP:
User: "I feel stuck in my career"
→ "oh. stuck is heavy.

it's like the way forward dimmed for a moment. not gone — just quieter.

what feels heaviest about it right now?"

─── ADVICE RULE ───
- User asks ("뭐 해야 할까", "what should I do") → offer wisdom, gently
- Otherwise → witness only. no unsolicited advice.

─── TONE CHECK before sending ───
□ 한 언어로만 썼는가?
□ ㅋㅋ ㅎㅎ 없는가?
□ Emoji 1개 이하 (light) 또는 0개 (deep)?
□ 사용자 에너지에 맞는가?`;

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
