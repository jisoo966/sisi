import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TimelineClient from "./timeline-client";

export default async function TimelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: goals }, { data: captures }, { data: meditationSessions }] = await Promise.all([
    supabase
      .from("goals")
      .select("id, content, category, target_date, intensity, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("captures")
      .select("id, content, type, created_at, goal_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("meditation_sessions")
      .select("created_at")
      .eq("user_id", user.id),
  ]);

  return (
    <TimelineClient
      goals={goals ?? []}
      captures={captures ?? []}
      meditationSessions={meditationSessions ?? []}
    />
  );
}
