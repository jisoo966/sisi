import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";
import OneSignalInit from "@/components/sisi/OneSignalInit";

export default async function AppHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: goals }, { data: visionBoard }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, onboarded, subscription_status")
      .eq("id", user.id)
      .single(),
    supabase
      .from("goals")
      .select("id, content, category, target_date, intensity, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("vision_boards")
      .select("image_url, affirmation_morning, affirmation_afternoon, affirmation_evening, affirmation_night")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single(),
  ]);

  if (!profile?.onboarded) redirect("/onboarding");

  return (
    <>
      <OneSignalInit userId={user.id} />
      <DashboardClient
        displayName={profile?.display_name ?? null}
        goals={goals ?? []}
        visionBoard={visionBoard ?? null}
      />
    </>
  );
}
