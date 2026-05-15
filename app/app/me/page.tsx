import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MeClient from "./me-client";

export default async function MePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: goals }, { data: captures }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase
      .from("goals")
      .select("id, content, category, status, target_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("captures")
      .select("id")
      .eq("user_id", user.id),
  ]);

  return (
    <MeClient
      profile={profile}
      email={user.email ?? ""}
      goalCount={goals?.length ?? 0}
      captureCount={captures?.length ?? 0}
      goals={goals ?? []}
    />
  );
}
