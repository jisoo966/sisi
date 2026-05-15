"use client";

import { useState } from "react";
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
  { id: "sisi_soft", label: "sísí soft", sub: "warm, like a wise older sister" },
  { id: "sisi_whisper", label: "sísí whisper", sub: "quiet, contemplative" },
  { id: "sisi_grounded", label: "sísí grounded", sub: "deep, confident" },
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
    if (!user) return;

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
    <main className="min-h-screen bg-[#F5EFE6]">
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/app" className="font-garamond text-sm text-[#6B5648] hover:text-[#3D2E25] transition-colors">
          ← back
        </Link>
        <span className="font-fraunces text-lg text-[#3D2E25]">me</span>
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
          <div className="w-16 h-16 bg-[#3D2E25] flex items-center justify-center mx-auto mb-4">
            <span className="font-caveat text-[#D4A82A] text-2xl">✦</span>
          </div>
          <h1 className="font-fraunces text-3xl text-[#3D2E25]">
            {profile?.display_name ?? "love"}
          </h1>
          <p className="font-garamond italic text-[#8FA38C] text-sm mt-1">{email}</p>
          {memberSince && (
            <p className="font-garamond text-xs text-[#8FA38C]/60 mt-1">
              with sísí since {memberSince}
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
            <div key={stat.label} className="bg-[#FAF6F0] border border-[#3D2E25]/8 py-4 text-center">
              <p className="font-fraunces text-2xl text-[#3D2E25]">{stat.value}</p>
              <p className="font-garamond italic text-xs text-[#8FA38C] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Subscription */}
        <div className="bg-[#FAF6F0] border border-[#3D2E25]/8 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest mb-1">plan</p>
              <p className="font-fraunces text-lg text-[#3D2E25] capitalize">
                {profile?.subscription_status ?? "free"}
              </p>
            </div>
            {profile?.subscription_status !== "premium" && (
              <Link
                href="/upgrade"
                className="font-garamond text-sm border border-[#D4A82A] text-[#D4A82A] px-4 py-2 hover:bg-[#D4A82A] hover:text-[#3D2E25] transition-all"
              >
                upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Display name */}
        <div>
          <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest mb-3">
            your name
          </p>
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
            placeholder="what do i call you?"
            className="w-full bg-transparent border-b border-[#3D2E25]/30 focus:border-[#D4A82A] outline-none py-3 font-garamond text-base text-[#3D2E25] placeholder-[#6B5648]/40 transition-colors"
          />
        </div>

        {/* Sísí voice */}
        <div>
          <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest mb-3">
            sísí's voice
          </p>
          <div className="flex flex-col gap-2">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => { setVoice(v.id); setSaved(false); }}
                className={`flex items-center justify-between p-4 border transition-all text-left ${
                  voice === v.id
                    ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                    : "bg-[#FAF6F0] text-[#6B5648] border-[#3D2E25]/8 hover:border-[#3D2E25]/30"
                }`}
              >
                <div>
                  <p className="font-garamond text-sm">{v.label}</p>
                  <p className={`font-garamond italic text-xs mt-0.5 ${voice === v.id ? "text-[#D4A82A]" : "text-[#8FA38C]"}`}>
                    {v.sub}
                  </p>
                </div>
                {voice === v.id && (
                  <span className="font-caveat text-[#D4A82A] text-lg">✦</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Reminder times */}
        <div>
          <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest mb-3">
            reminder times
          </p>
          <div className="grid grid-cols-4 gap-2">
            {REMINDER_OPTIONS.map(({ time, label }) => (
              <button
                key={time}
                onClick={() => toggleReminder(time)}
                className={`py-3 font-garamond text-sm border transition-all ${
                  reminders.includes(time)
                    ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                    : "text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/40"
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
              ? "bg-[#8FA38C] text-[#F5EFE6]"
              : "bg-[#3D2E25] text-[#F5EFE6] hover:bg-[#3A302A]"
          } disabled:opacity-40`}
        >
          {saving ? "saving..." : saved ? "saved ✦" : "save changes"}
        </button>

        {/* Active goals */}
        {activeGoals.length > 0 && (
          <div>
            <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest mb-3">
              what you are calling in
            </p>
            <div className="flex flex-col gap-2">
              {activeGoals.map((goal) => (
                <div key={goal.id} className="bg-[#FAF6F0] border border-[#3D2E25]/8 p-4 flex items-start gap-3">
                  <span className="font-caveat text-[#D4A82A] text-lg mt-0.5">◇</span>
                  <p className="font-garamond text-[#3D2E25] text-sm leading-relaxed">
                    {goal.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className="pt-4 border-t border-[#3D2E25]/10">
          <button
            onClick={signOut}
            className="w-full py-4 font-garamond text-sm text-[#6B5648]/60 hover:text-[#3D2E25] transition-colors"
          >
            sign out
          </button>
        </div>
      </div>
    </main>
  );
}
