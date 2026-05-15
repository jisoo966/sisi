"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Meditation = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  audio_url: string;
  is_premium: boolean;
  order_index: number | null;
};

const CATEGORIES = [
  { id: "love", label: "love & connection", symbol: "♡", sub: "calling in your person" },
  { id: "abundance", label: "abundance & career", symbol: "◈", sub: "receiving what is yours" },
  { id: "peace", label: "inner peace & healing", symbol: "◎", sub: "returning to yourself" },
  { id: "sleep", label: "sleep & sats", symbol: "☽", sub: "falling asleep in the assumption" },
  { id: "self_worth", label: "self-worth", symbol: "✦", sub: "remembering who you are" },
];

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MeditationsClient({
  meditations,
  isPremium,
  listenedIds,
}: {
  meditations: Meditation[];
  isPremium: boolean;
  listenedIds: Set<string>;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? meditations.filter((m) => m.category === activeCategory)
    : meditations;

  const isEmpty = meditations.length === 0;

  return (
    <main className="min-h-screen bg-[#F5EFE6]">
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/app" className="font-garamond text-sm text-[#6B5648] hover:text-[#3D2E25] transition-colors">
          ← back
        </Link>
        <span className="font-fraunces text-lg text-[#3D2E25]">meditations</span>
        <div className="w-12" />
      </header>

      <div className="px-6 max-w-lg mx-auto pb-16">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 mb-8"
        >
          <h1 className="font-fraunces text-4xl text-[#3D2E25] mb-2">listen.</h1>
          <p className="font-garamond text-[#6B5648] leading-relaxed">
            sísí's voice, holding space for what you are becoming.
          </p>
        </motion.div>

        {/* Category filter */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 py-2 font-garamond text-sm border transition-all ${
                !activeCategory
                  ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                  : "text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/40"
              }`}
            >
              all
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`shrink-0 px-4 py-2 font-garamond text-sm border transition-all ${
                  activeCategory === cat.id
                    ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                    : "text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/40"
                }`}
              >
                {cat.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state — no meditations uploaded yet */}
        {isEmpty ? (
          <div className="space-y-4">
            <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest mb-4">
              coming soon
            </p>
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#FAF6F0] border border-[#3D2E25]/8 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 items-start">
                    <span className="font-caveat text-2xl text-[#D4A82A]/50 mt-0.5">
                      {cat.symbol}
                    </span>
                    <div>
                      <p className="font-fraunces text-lg text-[#3D2E25]/50">{cat.label}</p>
                      <p className="font-garamond italic text-sm text-[#8FA38C] mt-0.5">
                        {cat.sub}
                      </p>
                    </div>
                  </div>
                  <span className="font-garamond text-xs text-[#8FA38C] italic mt-1">soon</span>
                </div>
              </motion.div>
            ))}

            <div className="mt-8 bg-[#3D2E25] px-6 py-6 text-center">
              <p className="font-caveat text-[#D4A82A] text-xl mb-2">☽</p>
              <p className="font-fraunces text-lg text-[#F5EFE6] mb-2">
                sísí's voice is being recorded.
              </p>
              <p className="font-garamond italic text-[#F5EFE6]/60 text-sm">
                meditations will appear here once uploaded.
              </p>
            </div>
          </div>
        ) : (
          /* Meditation cards */
          <div className="space-y-3">
            {filtered.map((med, i) => {
              const cat = CATEGORIES.find((c) => c.id === med.category);
              const listened = listenedIds.has(med.id);
              const locked = med.is_premium && !isPremium;

              return (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {locked ? (
                    <div className="bg-[#FAF6F0] border border-[#3D2E25]/8 p-5 opacity-60">
                      <MeditationCard med={med} cat={cat} listened={listened} locked />
                    </div>
                  ) : (
                    <Link href={`/meditations/${med.id}`}>
                      <div className="bg-[#FAF6F0] border border-[#3D2E25]/8 p-5 hover:border-[#D4A82A]/30 transition-colors">
                        <MeditationCard med={med} cat={cat} listened={listened} locked={false} />
                      </div>
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function MeditationCard({
  med,
  cat,
  listened,
  locked,
}: {
  med: Meditation;
  cat: typeof CATEGORIES[number] | undefined;
  listened: boolean;
  locked: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-4 items-start flex-1 min-w-0">
        <span className="font-caveat text-2xl text-[#D4A82A] mt-0.5 shrink-0">
          {cat?.symbol ?? "✦"}
        </span>
        <div className="min-w-0">
          <p className="font-fraunces text-lg text-[#3D2E25] leading-snug">{med.title}</p>
          {med.description && (
            <p className="font-garamond italic text-sm text-[#6B5648] mt-0.5 leading-relaxed">
              {med.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {cat && (
              <span className="font-garamond text-xs text-[#8FA38C]">{cat.label}</span>
            )}
            {med.duration_seconds && (
              <span className="font-garamond text-xs text-[#8FA38C]">
                · {formatDuration(med.duration_seconds)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 mt-1">
        {locked ? (
          <span className="font-garamond text-xs text-[#D4A82A] border border-[#D4A82A]/40 px-2 py-1">
            premium
          </span>
        ) : listened ? (
          <span className="font-caveat text-[#8FA38C] text-lg">✓</span>
        ) : (
          <div className="w-9 h-9 bg-[#3D2E25] flex items-center justify-center">
            <span className="text-[#F5EFE6] text-xs">▶</span>
          </div>
        )}
      </div>
    </div>
  );
}
