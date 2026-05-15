"use client";

import { useState, useEffect, useRef } from "react";
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
      if (!user) return;

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
      <main className="min-h-screen bg-[#F5EFE6] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="font-caveat text-4xl text-[#D4A82A]"
        >
          ✦
        </motion.div>
      </main>
    );
  }

  const symbol = CATEGORY_SYMBOLS[meditation.category] ?? "✦";

  return (
    <main className="min-h-screen bg-[#3D2E25] flex flex-col">
      <audio
        ref={audioRef}
        src={meditation.audio_url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleEnded}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/meditations" className="font-garamond text-sm text-[#F5EFE6]/50 hover:text-[#F5EFE6] transition-colors">
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
          className="font-caveat text-7xl text-[#D4A82A] mb-8"
        >
          {symbol}
        </motion.div>

        <p className="font-garamond text-sm text-[#D4A82A]/70 uppercase tracking-widest mb-3">
          {meditation.category.replace("_", " ")}
        </p>
        <h1 className="font-fraunces text-3xl text-[#F5EFE6] mb-4 leading-snug">
          {meditation.title}
        </h1>
        {meditation.description && (
          <p className="font-garamond italic text-[#F5EFE6]/50 leading-relaxed max-w-xs">
            {meditation.description}
          </p>
        )}

        {completed && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-garamond italic text-[#D4A82A] text-sm mt-4"
          >
            you showed up for yourself today.
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
            className="w-full accent-[#D4A82A] h-px bg-[#F5EFE6]/20 appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #D4A82A ${progress}%, rgba(245,239,230,0.2) ${progress}%)`,
            }}
          />
          <div className="flex justify-between mt-2">
            <span className="font-garamond text-xs text-[#F5EFE6]/40">
              {formatTime(currentTime)}
            </span>
            <span className="font-garamond text-xs text-[#F5EFE6]/40">
              {duration ? formatTime(duration) : "--:--"}
            </span>
          </div>
        </div>

        {/* Play/pause */}
        <div className="flex items-center justify-center gap-8">
          {/* Rewind 15s */}
          <button
            onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 15; }}
            className="font-garamond text-[#F5EFE6]/40 hover:text-[#F5EFE6] transition-colors text-sm"
          >
            −15s
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full border-2 border-[#D4A82A] flex items-center justify-center hover:bg-[#D4A82A]/10 transition-colors"
          >
            {playing ? (
              <span className="text-[#D4A82A] text-xl font-light">⏸</span>
            ) : (
              <span className="text-[#D4A82A] text-xl ml-1">▶</span>
            )}
          </button>

          {/* Forward 15s */}
          <button
            onClick={() => { if (audioRef.current) audioRef.current.currentTime += 15; }}
            className="font-garamond text-[#F5EFE6]/40 hover:text-[#F5EFE6] transition-colors text-sm"
          >
            +15s
          </button>
        </div>
      </div>
    </main>
  );
}
