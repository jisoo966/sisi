"use client";

import { useState } from "react";
import { LOCAL_ONLY } from "@/lib/dataMode";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Profile = {
  display_name: string | null;
  subscription_status: string;
  preferred_sisi_voice: string;
  reminder_times: string[];
  created_at: string;
};

type Goal = {
  id: string;
  content: string;
  category: string | null;
  status: string;
  target_date: string | null;
  created_at: string;
};

const VOICES = [
  { id: "sisi_soft", label: "Sísí soft", sub: "warm, like a wise older sister" },
  { id: "sisi_whisper", label: "Sísí whisper", sub: "quiet, contemplative" },
  { id: "sisi_grounded", label: "Sísí grounded", sub: "deep, confident" },
];

const REMINDER_OPTIONS = [
  { time: "07:00", label: "7am" },
  { time: "08:00", label: "8am" },
  { time: "12:00", label: "12pm" },
  { time: "14:00", label: "2pm" },
  { time: "17:00", label: "5pm" },
  { time: "20:00", label: "8pm" },
  { time: "21:00", label: "9pm" },
  { time: "22:00", label: "10pm" },
];

export default function MeClient({
  profile,
  email,
  goalCount,
  captureCount,
  goals,
}: {
  profile: Profile | null;
  email: string;
  goalCount: number;
  captureCount: number;
  goals: Goal[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [voice, setVoice] = useState(profile?.preferred_sisi_voice ?? "sisi_soft");
  const [reminders, setReminders] = useState<string[]>(profile?.reminder_times ?? ["08:00", "21:00"]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleReminder(time: string) {
    setReminders((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
    setSaved(false);
  }

  async function saveProfile() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || LOCAL_ONLY) {
      // local-only mode: keep the name on this device
      try { localStorage.setItem("sisi:guest-name", displayName.trim()); } catch {}
      setSaving(false);
      return;
    }

    await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      preferred_sisi_voice: voice,
      reminder_times: reminders,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const activeGoals = goals.filter((g) => g.status === "active");
  const manifestedGoals = goals.filter((g) => g.status === "manifested");

  return (
    <main className="min-h-dvh bg-paper">
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/app" className="t-body text-ink/80 hover:text-ink transition-colors">
          ← back
        </Link>
        <span className="t-card-title text-ink">me</span>
        <div className="w-12" />
      </header>

      <div className="px-6 max-w-lg mx-auto pb-16 space-y-8">

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center pt-4"
        >
          <div className="w-16 h-16 bg-ink flex items-center justify-center mx-auto mb-4">
            <span className="t-screen-title text-ink/70">✦</span>
          </div>
          <h1 className="t-display text-ink">
            {profile?.display_name ?? "love"}
          </h1>
          <p className="ds-helper italic text-ink/60 mt-1">{email}</p>
          {memberSince && (
            <p className="t-meta text-ink/60 mt-1">
              with Sísí since {memberSince}
            </p>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { value: activeGoals.length, label: "calling in" },
            { value: manifestedGoals.length, label: "manifested" },
            { value: captureCount, label: "captured" },
          ].map((stat) => (
            <div key={stat.label} className="bg-paper border border-ink/8 py-4 text-center">
              <p className="t-screen-title text-ink">{stat.value}</p>
              <p className="t-meta italic text-ink/60 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Subscription */}
        <div className="bg-paper border border-ink/8 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="t-meta text-ink/60 mb-1">plan</p>
              <p className="t-card-title text-ink capitalize">
                {profile?.subscription_status ?? "free"}
              </p>
            </div>
            {profile?.subscription_status !== "premium" && (
              <Link
                href="/upgrade"
                className="ds-btn ds-btn--secondary"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Display name */}
        <div>
          <p className="t-meta text-ink/60 mb-3">
            Your name
          </p>
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
            placeholder="What should I call you?"
            className="ds-field w-full"
          />
        </div>

        {/* Sísí voice */}
        <div>
          <p className="t-meta text-ink/60 mb-3">
            Sísí's voice
          </p>
          <div className="flex flex-col gap-2">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => { setVoice(v.id); setSaved(false); }}
                className={`flex items-center justify-between p-4 border transition-all text-left ${
                  voice === v.id
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper text-ink/80 border-ink/8 hover:border-ink/30"
                }`}
              >
                <div>
                  <p className="t-body">{v.label}</p>
                  <p className={`font-garamond italic text-xs mt-0.5 ${voice === v.id ? "text-ink/70" : "text-ink/60"}`}>
                    {v.sub}
                  </p>
                </div>
                {voice === v.id && (
                  <span className="t-card-title text-ink/70">✦</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Reminder times */}
        <div>
          <p className="t-meta text-ink/60 mb-3">
            Reminder times
          </p>
          <div className="grid grid-cols-4 gap-2">
            {REMINDER_OPTIONS.map(({ time, label }) => (
              <button
                key={time}
                onClick={() => toggleReminder(time)}
                className={`py-3 font-garamond text-sm border transition-all ${
                  reminders.includes(time)
                    ? "bg-ink text-paper border-ink"
                    : "text-ink/80 border-ink/20 hover:border-ink/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={saveProfile}
          disabled={saving}
          className={`w-full py-4 font-garamond text-base transition-all ${
            saved
              ? "bg-ink/60 text-paper"
              : "bg-ink text-paper hover:bg-ink"
          } disabled:opacity-40`}
        >
          {saving ? "saving..." : saved ? "Saved" : "Save changes"}
        </button>

        {/* Active goals */}
        {activeGoals.length > 0 && (
          <div>
            <p className="t-meta text-ink/60 mb-3">
              What you are calling in
            </p>
            <div className="flex flex-col gap-2">
              {activeGoals.map((goal) => (
                <div key={goal.id} className="bg-paper border border-ink/8 p-4 flex items-start gap-3">
                  <span className="t-card-title text-ink/70 mt-0.5">◇</span>
                  <p className="t-body text-ink">
                    {goal.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className="pt-4 border-t border-ink/10">
          <button
            onClick={signOut}
            className="t-body w-full py-4 text-ink/60 hover:text-ink transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
