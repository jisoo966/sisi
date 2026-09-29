"use client";

import { useState, useEffect, useRef } from "react";
import { LOCAL_ONLY } from "@/lib/dataMode";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Meditation = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  audio_url: string;
};

const CATEGORY_SYMBOLS: Record<string, string> = {
  love: "♡",
  abundance: "◈",
  peace: "◎",
  sleep: "☽",
  self_worth: "✦",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MeditationPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [meditation, setMeditation] = useState<Meditation | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("meditations")
        .select("*")
        .eq("id", params.id)
        .single();
      if (data) setMeditation(data);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || LOCAL_ONLY) return;

      const { data: session } = await supabase
        .from("meditation_sessions")
        .insert({ user_id: user.id, meditation_id: params.id })
        .select()
        .single();
      if (session) setSessionId(session.id);
    }
    load();
  }, [params.id]);

  async function markCompleted() {
    if (!sessionId || completed) return;
    setCompleted(true);
    const supabase = createClient();
    await supabase
      .from("meditation_sessions")
      .update({ completed: true, duration_listened: Math.floor(currentTime) })
      .eq("id", sessionId);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const val = parseFloat(e.target.value);
    audio.currentTime = val;
    setCurrentTime(val);
  }

  function handleEnded() {
    setPlaying(false);
    markCompleted();
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  if (!meditation) {
    return (
      <main className="min-h-dvh bg-paper flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="t-display text-paper/70"
        >
          ✦
        </motion.div>
      </main>
    );
  }

  const symbol = CATEGORY_SYMBOLS[meditation.category] ?? "✦";

  return (
    <main className="min-h-dvh bg-ink flex flex-col">
      <audio
        ref={audioRef}
        src={meditation.audio_url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleEnded}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/meditations" className="t-body text-paper/50 hover:text-paper transition-colors">
          ← back
        </Link>
        <div className="w-12" />
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Symbol */}
        <motion.div
          animate={playing ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="font-caveat text-7xl text-paper/70 mb-8"
        >
          {symbol}
        </motion.div>

        <p className="t-meta text-paper/70 mb-3">
          {meditation.category.replace("_", " ")}
        </p>
        <h1 className="t-display text-paper mb-4">
          {meditation.title}
        </h1>
        {meditation.description && (
          <p className="font-garamond italic text-paper/50 leading-relaxed max-w-xs">
            {meditation.description}
          </p>
        )}

        {completed && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="ds-helper italic text-paper/70 mt-4"
          >
            You showed up for yourself today.
          </motion.p>
        )}
      </div>

      {/* Player controls */}
      <div className="px-8 pb-16">
        {/* Progress bar */}
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-star h-px bg-paper/20 appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--sisi-gold) ${progress}%, rgba(245, 239, 221,0.2) ${progress}%)`,
            }}
          />
          <div className="flex justify-between mt-2">
            <span className="t-meta text-paper/40">
              {formatTime(currentTime)}
            </span>
            <span className="t-meta text-paper/40">
              {duration ? formatTime(duration) : "--:--"}
            </span>
          </div>
        </div>

        {/* Play/pause */}
        <div className="flex items-center justify-center gap-8">
          {/* Rewind 15s */}
          <button
            onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 15; }}
            className="t-body text-paper/40 hover:text-paper transition-colors"
          >
            −15s
          </button>

          <button
            onClick={togglePlay}
            className="ds-btn ds-btn--secondary"
          >
            {playing ? (
              <span className="text-paper/70 text-xl font-light">⏸</span>
            ) : (
              <span className="text-paper/70 text-xl ml-1">▶</span>
            )}
          </button>

          {/* Forward 15s */}
          <button
            onClick={() => { if (audioRef.current) audioRef.current.currentTime += 15; }}
            className="t-body text-paper/40 hover:text-paper transition-colors"
          >
            +15s
          </button>
        </div>
      </div>
    </main>
  );
}
