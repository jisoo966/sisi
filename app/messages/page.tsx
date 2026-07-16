"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/sisi/BottomNav";
import { FoxAvatar } from "@/components/sisi/FoxAvatar";
import { createClient } from "@/lib/supabase/client";
import {
  loadRecentSessions,
  type ChatSession,
} from "@/lib/chatSessions";

export const dynamic = "force-dynamic";

/**
 * /messages — Dashboard 화면. Chat은 /messages/chat에서 immersive하게.
 *
 * 구성:
 *   - Header "Messages"
 *   - 여우 illustration + "Your companion is here"
 *   - "Today's check-in" 카드 + question
 *   - "Talk to the fox" primary CTA → /messages/chat
 *   - Recent conversations (로그인 유저만) → 탭 시 그 세션 이어보기
 *   - BottomNav
 */
export default function MessagesDashboardPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      if (user) {
        const list = await loadRecentSessions(6);
        setSessions(list);
      }
      setLoaded(true);
    })();
  }, []);

  return (
    <main
      className="relative min-h-svh w-full"
      style={{ backgroundColor: "#f7f2e3" }}
    >
      <div className="relative z-10 flex min-h-svh flex-col pt-[52px] px-[24px] pb-[100px]">
        {/* Header */}
        <header className="mb-1">
          <h1 className="font-sentient text-[22px] text-journey-navy/95">
            Messages
          </h1>
        </header>
        <p className="font-sentient text-[13px] text-journey-navy/60 italic mb-[36px]">
          your companion is here
        </p>

        {/* Fox illustration */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center mb-[24px]"
        >
          <div className="relative">
            {/* Warm glow behind fox */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(177,156,217,0.35) 0%, transparent 70%)",
                filter: "blur(24px)",
                transform: "scale(1.6)",
              }}
            />
            <div className="relative">
              <FoxAvatar size={120} />
            </div>
          </div>
        </motion.div>

        {/* Today's check-in card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mb-[20px]"
        >
          <div className="rounded-[20px] bg-white/60 backdrop-blur-md border border-white/50 px-[24px] py-[20px] text-center shadow-sm">
            <p className="font-sentient text-[11px] text-journey-navy/50 tracking-widest uppercase mb-[10px]">
              Today&apos;s check-in
            </p>
            <p className="font-sentient text-[20px] text-journey-navy leading-[1.3]">
              What stayed with
              <br />
              you today?
            </p>
          </div>
        </motion.div>

        {/* Talk to the fox CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mb-[36px]"
        >
          <Link
            href="/messages/chat"
            className="font-sentient block w-full text-center rounded-[28px] bg-journey-purple/85 backdrop-blur-md border border-white/40 text-journey-navy text-[16px] h-[56px] flex items-center justify-center shadow-lg hover:brightness-105 active:scale-98 transition-all"
          >
            Talk to sísí ✦
          </Link>
        </motion.div>

        {/* Recent conversations — 로그인 유저만 */}
        {loaded && isLoggedIn === true && sessions.length > 0 && (
          <RecentConversations sessions={sessions} />
        )}
        {loaded && isLoggedIn === true && sessions.length === 0 && (
          <p className="font-sentient italic text-[13px] text-journey-navy/45 text-center mt-[12px]">
            your first conversation starts a memory.
          </p>
        )}
        {loaded && isLoggedIn === false && (
          <GuestRecentPlaceholder />
        )}
      </div>

      <BottomNav theme="light" />
    </main>
  );
}

/* ─── Recent conversations list ────────────────────────── */

function RecentConversations({ sessions }: { sessions: ChatSession[] }) {
  const grouped = groupSessionsByDate(sessions);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <p className="font-sentient text-[13px] text-journey-navy/70 tracking-wider mb-[14px]">
        Recent conversations
      </p>

      <div className="flex flex-col gap-[24px]">
        {grouped.map(({ dateLabel, items }) => (
          <div key={dateLabel}>
            <div className="flex items-center gap-[8px] mb-[10px]">
              <div className="h-[5px] w-[5px] rounded-full bg-journey-purple" />
              <p className="font-sentient text-[12px] text-journey-navy/60 tracking-wider">
                {dateLabel}
              </p>
            </div>

            <div className="flex flex-col gap-[8px] pl-[13px]">
              {items.map((session, i) => (
                <SessionEntry
                  key={session.id}
                  session={session}
                  delay={i * 0.04}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SessionEntry({
  session,
  delay,
}: {
  session: ChatSession;
  delay: number;
}) {
  const time = formatTime(session.lastMessageAt);
  const preview =
    session.firstMessage?.slice(0, 60) ??
    "a quiet conversation";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Link
        href={`/messages/chat?session=${session.id}`}
        className="flex items-start gap-[12px] w-full text-left p-[12px] rounded-[14px] bg-white/60 hover:bg-white active:scale-98 transition"
      >
        {/* Fox icon */}
        <div className="shrink-0 mt-[2px]">
          <FoxAvatar size={36} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-sentient text-[11px] text-journey-navy/50 tracking-wider mb-[3px]">
            {time}
          </p>
          <p className="font-sentient text-[14px] text-journey-navy/90 leading-snug line-clamp-2">
            {preview}
            {session.firstMessage && session.firstMessage.length > 60 && "…"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Guest placeholder ────────────────────────────────── */

function GuestRecentPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="mt-[24px] p-[20px] rounded-[16px] bg-white/50 border border-journey-navy/8 text-center"
    >
      <p className="font-sentient italic text-[13px] text-journey-navy/70 leading-relaxed mb-[10px]">
        log in to keep your conversations
        <br />
        with sísí.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center gap-1 font-sentient text-[13px] text-journey-purple hover:brightness-90 transition"
      >
        log in ✦
      </Link>
    </motion.div>
  );
}

/* ─── Helpers ─────────────────────────────────────────── */

function groupSessionsByDate(sessions: ChatSession[]): {
  dateLabel: string;
  items: ChatSession[];
}[] {
  const map = new Map<string, ChatSession[]>();
  for (const s of sessions) {
    const key = s.lastMessageAt.slice(0, 10); // YYYY-MM-DD
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  const keys = Array.from(map.keys()).sort().reverse();
  return keys.map((key) => ({
    dateLabel: formatDateLabel(key),
    items: map.get(key)!,
  }));
}

function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
