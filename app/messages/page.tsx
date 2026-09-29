"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StickerNavigationHost } from "@/components/ds";
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
      className="relative min-h-dvh w-full"
      style={{ backgroundColor: "var(--sisi-paper)" }}
    >
      <div className="relative z-10 flex min-h-dvh flex-col pt-[52px] px-[24px] pb-[100px]">
        {/* Header */}
        <header className="mb-1">
          <h1 className="t-screen-title text-journey-navy/95">
            Messages
          </h1>
        </header>
        <p className="ds-helper text-journey-navy/60 italic mb-[36px]">
          A quiet space to talk with Sísí
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
                  "radial-gradient(circle, rgba(113, 152, 216,0.35) 0%, transparent 70%)",
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
          <div className="ds-paper ds-paper--speech px-[24px] py-[20px] text-center" style={{ borderRadius: "var(--paper-radius)", boxShadow: "var(--paper-shadow-soft)" }}>
            <p className="t-meta text-journey-navy/50 mb-[10px]">
              Today&apos;s check-in
            </p>
            <p className="t-card-title text-journey-navy">
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
            className="ds-btn ds-btn--primary ds-btn--block block w-full"
          >
            Talk to Sísí
          </Link>
        </motion.div>

        {/* Recent conversations — 로그인 유저만 */}
        {loaded && isLoggedIn === true && sessions.length > 0 && (
          <RecentConversations sessions={sessions} />
        )}
        {loaded && isLoggedIn === true && sessions.length === 0 && (
          <p className="ds-helper italic text-journey-navy/45 text-center mt-[12px]">
            Your first conversation starts a memory.
          </p>
        )}
        {loaded && isLoggedIn === false && (
          <GuestRecentPlaceholder />
        )}
      </div>

      <StickerNavigationHost />
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
      <p className="t-body text-journey-navy/70 mb-[14px]">
        Recent conversations
      </p>

      <div className="flex flex-col gap-[24px]">
        {grouped.map(({ dateLabel, items }) => (
          <div key={dateLabel}>
            <div className="flex items-center gap-[8px] mb-[10px]">
              <div className="h-[5px] w-[5px] rounded-full bg-star" />
              <p className="t-meta text-journey-navy/60">
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
        className="ds-star-row w-full p-[12px]"
      >
        {/* Fox icon */}
        <div className="shrink-0 mt-[2px]">
          <FoxAvatar size={36} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="t-meta text-journey-navy/50 mb-[3px]">
            {time}
          </p>
          <p className="t-body text-journey-navy/90 line-clamp-2">
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
      className="mt-[24px] p-[20px] rounded-[16px] bg-paper/50 border border-journey-navy/8 text-center"
    >
      <p className="ds-helper italic text-journey-navy/70 mb-[10px]">
        Save your conversations
        <br />
        when you&apos;re ready.
      </p>
      <Link
        href="/login"
        className="ds-text-action"
      >
        Log in
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
