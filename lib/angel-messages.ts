import Anthropic from "@anthropic-ai/sdk";

const FALLBACK_MESSAGES = [
  "what you are asking for is asking for you too.",
  "the version of you who has it all already exists. you are her.",
  "you are not waiting for it. it is moving toward you.",
  "every assumption you hold in love becomes your reality.",
  "rest in the knowing. it is done.",
  "your desires are not accidents. they are directions.",
  "you are the operant power. nothing is outside of you.",
  "today, assume the best. watch what moves.",
  "it is already written. you are just living into it.",
  "she who knows she is loved is magnetic.",
];

export async function generateAngelMessage(goals: string[]): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
  }

  try {
    const client = new Anthropic();
    const goalContext = goals.length
      ? `the user is currently manifesting: ${goals.slice(0, 3).join(", ")}.`
      : "the user is on a manifestation journey.";

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: `You are Sísí — a mature, wise inner voice rooted in Neville Goddard's teachings. ${goalContext}

Write ONE short angel message (1–2 sentences max) that feels like a quiet knowing from a wise older sister.

Rules:
- Lowercase only
- No exclamation marks
- No spiritual cringe ("high vibe", "universe has your back")
- No AI language
- Rooted in the assumption that what she wants already is
- Warm but not gushing

Output only the message text, nothing else.`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : null;
    return text ?? FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
  } catch {
    return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
  }
}
