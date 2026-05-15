"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Goal = {
  id: string;
  content: string;
  category: string | null;
  target_date: string | null;
  intensity: string;
  status: string;
};

type VisionBoard = {
  image_url: string;
  affirmation_morning: string | null;
  affirmation_afternoon: string | null;
  affirmation_evening: string | null;
  affirmation_night: string | null;
};

function getTimeContext() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

function getTimeAffirmation(board: VisionBoard | null, time: string) {
  if (board) {
    const map: Record<string, string | null> = {
      morning: board.affirmation_morning,
      afternoon: board.affirmation_afternoon,
      evening: board.affirmation_evening,
      night: board.affirmation_night,
    };
    if (map[time]) return map[time]!;
  }
  const defaults: Record<string, string> = {
    morning: "today, i receive what is mine.",
    afternoon: "the universe is conspiring with me.",
    evening: "i trust the becoming.",
    night: "i sleep in the assumption that it is done.",
  };
  return defaults[time];
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const MARQUEE_TEXT =
  "what is meant for you is on its way  ✦  the universe is responding  ✦  from depth, not from formula  ✦  what you call in, you become  ✦  ";

const NAV_ITEMS = [
  { href: "/app", label: "home", icon: HomeIcon },
  { href: "/vision-board", label: "manifest", icon: ManifestIcon },
  { href: "/app/me", label: "me", icon: MeIcon },
  { href: "/chat", label: "chat", icon: ChatIcon },
  { href: "/meditations", label: "listen", icon: ListenIcon },
];

const TABS = ["today", "this week", "this month"] as const;
type Tab = (typeof TABS)[number];

export default function DashboardClient({
  displayName,
  goals,
  visionBoard,
}: {
  displayName: string | null;
  goals: Goal[];
  visionBoard: VisionBoard | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [time, setTime] = useState(getTimeContext());

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeContext()), 60000);
    return () => clearInterval(interval);
  }, []);

  const affirmation = getTimeAffirmation(visionBoard, time);
  const name = displayName ?? "love";

  return (
    <div className="min-h-screen bg-[#F5EFE6] flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-8 pb-2">
        <span className="font-fraunces text-2xl text-[#3D2E25] tracking-wide">
          Sísí
        </span>
        <div className="flex items-center gap-4">
          <button className="relative">
            <BellIcon />
          </button>
          <button>
            <MenuIcon />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="px-5 pt-4 pb-5"
        >
          <h1 className="font-fraunces text-5xl text-[#3D2E25] leading-tight">
            hi, {name}.
          </h1>
        </motion.div>

        {/* Tabs */}
        <div className="px-5 mb-5">
          <div className="flex border border-dashed border-[#3D2E25]/40 p-1 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 font-garamond text-xs uppercase tracking-widest transition-all ${
                  activeTab === tab
                    ? "bg-[#3D2E25] text-[#F5EFE6]"
                    : "text-[#6B5648] hover:text-[#3D2E25]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Card */}
        <div className="px-5 mb-6">
          {visionBoard ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#FAF6F0] border border-[#3D2E25]/10 overflow-hidden"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={visionBoard.image_url}
                  alt="vision board"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <span className="font-garamond text-xs bg-[#D4A82A] text-[#3D2E25] px-3 py-1">
                    active
                  </span>
                </div>
              </div>
              <div className="p-4 flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-garamond text-xs text-[#8FA38C] uppercase tracking-widest mb-1">
                    your vision
                  </p>
                  <p className="font-fraunces text-xl text-[#3D2E25] leading-snug">
                    {goals[0]?.content ?? "your manifestation"}
                  </p>
                  <p className="font-garamond italic text-[#6B5648] text-sm mt-1">
                    {affirmation}
                  </p>
                </div>
                <Link
                  href="/vision-board"
                  className="w-10 h-10 bg-[#3D2E25] flex items-center justify-center ml-4 shrink-0"
                >
                  <span className="text-[#F5EFE6] text-sm">▶</span>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href="/vision-board">
                <div className="bg-[#3D2E25] overflow-hidden">
                  <div className="relative aspect-[4/3] flex flex-col items-center justify-center">
                    <div className="absolute inset-0 opacity-10">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute border border-[#D4A82A]"
                          style={{ inset: `${i * 14}px` }}
                        />
                      ))}
                    </div>
                    <p className="font-caveat text-4xl text-[#D4A82A] mb-3 relative z-10">✦</p>
                    <p className="font-fraunces text-lg text-[#F5EFE6] relative z-10 italic">
                      your vision awaits
                    </p>
                  </div>
                  <div className="p-4 flex items-start justify-between">
                    <div>
                      <p className="font-garamond text-xs text-[#D4A82A]/70 uppercase tracking-widest mb-1">
                        create now
                      </p>
                      <p className="font-fraunces text-xl text-[#F5EFE6]">
                        living vision board
                      </p>
                      <p className="font-garamond italic text-[#F5EFE6]/60 text-sm mt-1">
                        ai-generated, just for you
                      </p>
                    </div>
                    <div className="w-10 h-10 border border-[#D4A82A] flex items-center justify-center ml-4 shrink-0">
                      <span className="text-[#D4A82A] text-sm">▶</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </div>

        {/* Marquee */}
        <div className="overflow-hidden border-y border-[#3D2E25]/10 py-3 mb-6">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            className="flex whitespace-nowrap"
          >
            <span className="font-garamond italic text-sm text-[#6B5648] pr-0">
              {MARQUEE_TEXT}{MARQUEE_TEXT}
            </span>
          </motion.div>
        </div>

        {/* Goals section */}
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest">
              what you are calling in
            </p>
            <Link
              href="/goals/new"
              className="font-garamond text-xs text-[#D4A82A] hover:text-[#3D2E25] transition-colors"
            >
              + add
            </Link>
          </div>

          {goals.length > 0 ? (
            <div className="flex flex-col gap-3">
              {goals.map((goal) => {
                const days = goal.target_date ? daysUntil(goal.target_date) : null;
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-start gap-4 bg-[#FAF6F0] border border-[#3D2E25]/8 p-4"
                  >
                    <div className="font-caveat text-[#D4A82A] text-xl mt-0.5">◇</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-garamond text-[#3D2E25] leading-relaxed">
                        {goal.content}
                      </p>
                      {days !== null && (
                        <p className="font-garamond italic text-xs text-[#8FA38C] mt-1">
                          {days > 0 ? `${days} days away` : days === 0 ? "today." : "it is here."}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Link
              href="/goals/new"
              className="block border border-dashed border-[#3D2E25]/20 p-5 text-center hover:border-[#D4A82A]/50 transition-colors"
            >
              <p className="font-garamond italic text-[#6B5648]">
                what are you calling in?
              </p>
            </Link>
          )}
        </div>

        {/* Daily affirmation block */}
        <div className="px-5 mb-6">
          <div className="bg-[#3D2E25] px-6 py-8 text-center">
            <p className="font-caveat text-[#D4A82A] text-2xl mb-3">✦</p>
            <p className="font-fraunces text-xl text-[#F5EFE6] italic leading-relaxed">
              "{affirmation}"
            </p>
          </div>
        </div>

        {/* Explore grid */}
        <div className="px-5">
          <p className="font-garamond text-xs text-[#6B5648]/60 uppercase tracking-widest mb-4">
            explore sísí
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/chat", symbol: "◎", label: "chat with sísí", sub: "wise friend guidance" },
              { href: "/meditations", symbol: "☽", label: "meditations", sub: "5 categories" },
              { href: "/timeline", symbol: "◇", label: "timeline", sub: "your journey" },
              { href: "/app/me", symbol: "✦", label: "my profile", sub: "voice & settings" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border border-[#3D2E25]/10 bg-[#FAF6F0] p-4 hover:border-[#D4A82A]/40 transition-colors"
              >
                <p className="font-caveat text-xl text-[#D4A82A] mb-2">{item.symbol}</p>
                <p className="font-garamond text-[#3D2E25] text-sm">{item.label}</p>
                <p className="font-garamond italic text-[#8FA38C] text-xs mt-0.5">{item.sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#FAF6F0] border-t border-[#3D2E25]/10">
        <div className="flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/app";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  isActive ? "text-[#D4A82A]" : "text-[#6B5648]/50 hover:text-[#6B5648]"
                }`}
              >
                <Icon active={isActive} />
                <span className="font-garamond text-[10px] uppercase tracking-widest">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// Icons
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D2E25" strokeWidth="1.5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D2E25" strokeWidth="1.5">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D4A82A" : "#6B5648"} strokeWidth="1.5" opacity={active ? 1 : 0.5}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function ManifestIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D4A82A" : "#6B5648"} strokeWidth="1.5" opacity={active ? 1 : 0.5}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    </svg>
  );
}
function MeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D4A82A" : "#6B5648"} strokeWidth="1.5" opacity={active ? 1 : 0.5}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D4A82A" : "#6B5648"} strokeWidth="1.5" opacity={active ? 1 : 0.5}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ListenIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D4A82A" : "#6B5648"} strokeWidth="1.5" opacity={active ? 1 : 0.5}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}
