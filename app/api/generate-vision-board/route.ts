import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

fal.config({ credentials: process.env.FAL_API_KEY });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STYLE_PROMPTS: Record<string, string> = {
  vintage:
    "vintage mystical collage, warm cream and gold tones, botanical elements, vintage book pages, celestial motifs, soft ethereal light, film grain, tender hands, stars and moon, vintage frame, muted warm palette, no text, no faces",
  surreal:
    "surrealist fine art photograph, Magritte-inspired dreamlike scene, soft dramatic lighting, rich deep tones, poetic impossible architecture, floating objects, window into another world, cinematic, no text, no faces",
  golden:
    "golden hour editorial photography, warm amber light flooding a beautiful scene, soft bokeh, dreamy atmosphere, luxurious and serene, sun-drenched, rich warm golds and creams, impressionistic, no text, no faces",
  botanical:
    "lush botanical watercolor aesthetic, soft pressed flowers and leaves, delicate floral arrangements, gentle pastel tones with gold accents, garden abundance, tender and feminine, painterly, no text, no faces",
};

function buildImagePrompt(goalContent: string, style = "vintage") {
  const styleGuide = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.vintage;
  return `${styleGuide}, theme: ${goalContent}, ultra detailed, 9:16 vertical format`;
}

async function generateAffirmations(goalContent: string) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `You are Sísí — a mature wise inner self friend. Write 4 short affirmations (max 8 words each) for someone manifesting: "${goalContent}"

Rules:
- Always lowercase
- Declarative, present tense ("i am", "i receive", "it is")
- Mature warm tone, no cringe
- One for each: morning, afternoon, evening, night

Return ONLY valid JSON:
{"morning":"...","afternoon":"...","evening":"...","night":"..."}`,
      },
    ],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { goalId, goalContent, variationIndex = 0, style = "vintage" } = await request.json();
    if (!goalContent) return NextResponse.json({ error: "goal content required" }, { status: 400 });

    const prompt = buildImagePrompt(goalContent, style);

    // fal.ai Flux Schnell으로 이미지 생성
    const raw = await fal.run("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: "portrait_4_3",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      },
    });

    console.log("fal.ai raw result:", JSON.stringify(raw, null, 2));

    // fal.ai 응답: { data: { images: [...] }, requestId: ... }
    const result = raw as unknown as { data?: { images?: { url: string }[] }; images?: { url: string }[] };
    const images = result.data?.images ?? result.images ?? [];
    const imageUrl = images[0]?.url;
    if (!imageUrl) throw new Error("no image generated");

    // 이미지를 Supabase Storage에 저장
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const storagePath = `${user.id}/${Date.now()}-${variationIndex}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("vision-boards")
      .upload(storagePath, imageBuffer, { contentType: "image/jpeg" });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("vision-boards")
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      storagePath,
      goalId,
    });
  } catch (error) {
    console.error("vision board generation error:", error);
    return NextResponse.json({ error: "generation failed" }, { status: 500 });
  }
}

// 선택 확정 + affirmation 생성
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { imageUrl, storagePath, goalId, goalContent } = await request.json();

    // 기존 active vision board 비활성화
    await supabase
      .from("vision_boards")
      .update({ is_active: false })
      .eq("user_id", user.id);

    // affirmation 생성 (Anthropic 키 있을 때만)
    let affirmations = { morning: null, afternoon: null, evening: null, night: null };
    if (process.env.ANTHROPIC_API_KEY) {
      affirmations = await generateAffirmations(goalContent);
    }

    // 새 vision board 저장
    const { data: board, error } = await supabase
      .from("vision_boards")
      .insert({
        user_id: user.id,
        goal_id: goalId ?? null,
        prompt: goalContent,
        image_url: imageUrl,
        storage_path: storagePath,
        is_active: true,
        affirmation_morning: affirmations.morning,
        affirmation_afternoon: affirmations.afternoon,
        affirmation_evening: affirmations.evening,
        affirmation_night: affirmations.night,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, board });
  } catch (error) {
    console.error("vision board save error:", error);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}
