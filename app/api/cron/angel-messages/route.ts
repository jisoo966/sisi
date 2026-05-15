import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushNotification } from "@/lib/onesignal";
import { generateAngelMessage } from "@/lib/angel-messages";

// Vercel Cron — runs at 8am and 9pm UTC daily
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    return NextResponse.json({ skipped: "OneSignal not configured" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get users who have push enabled (onesignal_user_id set)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, onesignal_player_id")
    .not("onesignal_player_id", "is", null);

  if (!profiles?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const profile of profiles) {
    // Get their active goals for context
    const { data: goals } = await supabase
      .from("goals")
      .select("content")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .limit(3);

    const goalTexts = (goals ?? []).map((g) => g.content);
    const message = await generateAngelMessage(goalTexts);
    const name = profile.display_name ?? "love";

    await sendPushNotification({
      externalUserId: profile.id,
      title: `sísí for ${name}`,
      message,
    });

    sent++;
    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({ sent });
}
