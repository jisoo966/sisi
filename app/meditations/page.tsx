import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MeditationsClient from "./meditations-client";

export default async function MeditationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: meditations }, { data: profile }, { data: sessions }] = await Promise.all([
    supabase
      .from("meditations")
      .select("*")
      .order("order_index", { ascending: true }),
    supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single(),
    supabase
      .from("meditation_sessions")
      .select("meditation_id, completed")
      .eq("user_id", user.id),
  ]);

  const listenedIds = new Set((sessions ?? []).map((s) => s.meditation_id));

  return (
    <MeditationsClient
      meditations={meditations ?? []}
      isPremium={profile?.subscription_status === "premium"}
      listenedIds={listenedIds}
    />
  );
}
