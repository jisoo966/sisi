"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Goal = { id: string; content: string; category: string | null };

const CAPTURE_TYPES = [
  { id: "manifested", label: "it happened", sub: "something i called in arrived" },
  { id: "sign", label: "a sign", sub: "something that felt like a message" },
  { id: "feeling", label: "a feeling", sub: "something shifted inside" },
  { id: "coincidence", label: "a coincidence", sub: "that felt like more than chance" },
];

export default function CapturePage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [content, setContent] = useState("");
  const [type, setType] = useState("manifested");
  const [goalId, setGoalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("goals")
        .select("id, content, category")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (data) {
        setGoals(data);
        if (data.length === 1) setGoalId(data[0].id);
      }
    }
    load();
  }, []);

  async function save() {
    if (!content.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from("captures").insert({
      user_id: user.id,
      content: content.trim(),
      type,
      goal_id: goalId,
      input_method: "text",
    });

    setDone(true);
    setTimeout(() => router.push("/timeline"), 1800);
  }

  return (
    <main className="min-h-screen bg-[#F5EFE6]">
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/timeline" className="font-garamond text-sm text-[#6B5648] hover:text-[#3D2E25] transition-colors">
          ← back
        </Link>
        <span className="font-fraunces text-lg text-[#3D2E25]">capture</span>
        <div className="w-12" />
      </header>

      <div className="px-6 max-w-lg mx-auto pb-16">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mt-6 mb-8">
                <h1 className="font-fraunces text-4xl text-[#3D2E25] leading-tight mb-3">
                  what happened?
                </h1>
                <p className="font-garamond text-[#6B5648] leading-relaxed">
                  the universe speaks in small moments. capture this one.
                </p>
              </div>

              {/* Type selection */}
              <p className="font-garamond text-sm text-[#6B5648] mb-3">what was it?</p>
              <div className="grid grid-cols-2 gap-2 mb-7">
                {CAPTURE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`text-left p-3 border transition-all ${
                      type === t.id
                        ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                        : "text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/40"
                    }`}
                  >
                    <p className="font-garamond text-sm">{t.label}</p>
                    <p className={`font-garamond italic text-xs mt-0.5 ${type === t.id ? "text-[#D4A82A]" : "text-[#8FA38C]"}`}>
                      {t.sub}
                    </p>
                  </button>
                ))}
              </div>

              {/* Content */}
              <p className="font-garamond text-sm text-[#6B5648] mb-2">describe it:</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="write what you noticed..."
                rows={5}
                autoFocus
                className="w-full bg-transparent border border-[#3D2E25]/20 focus:border-[#D4A82A] outline-none p-4 font-garamond text-base text-[#3D2E25] placeholder-[#6B5648]/40 transition-colors resize-none mb-6"
              />

              {/* Goal link */}
              {goals.length > 1 && (
                <div className="mb-7">
                  <p className="font-garamond text-sm text-[#6B5648] mb-2">
                    which goal is this related to?
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setGoalId(null)}
                      className={`text-left p-3 border transition-all font-garamond text-sm ${
                        !goalId
                          ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                          : "text-[#6B5648] border-[#3D2E25]/20"
                      }`}
                    >
                      general
                    </button>
                    {goals.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGoalId(g.id)}
                        className={`text-left p-3 border transition-all font-garamond text-sm ${
                          goalId === g.id
                            ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                            : "text-[#6B5648] border-[#3D2E25]/20"
                        }`}
                      >
                        {g.content.length > 60 ? g.content.slice(0, 60) + "..." : g.content}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={save}
                disabled={!content.trim() || saving}
                className="w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "saving..." : "record this"}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="font-caveat text-6xl text-[#D4A82A] mb-6"
              >
                ◇
              </motion.div>
              <p className="font-fraunces text-3xl text-[#3D2E25] mb-3">noted.</p>
              <p className="font-garamond text-[#6B5648]">
                the universe keeps records too.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
