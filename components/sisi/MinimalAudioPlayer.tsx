"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

type Props = {
  title: string;
  category?: string;
  src: string;
  accent?: "gold" | "rose" | "sage" | "coral";
};

const ACCENTS = {
  gold:  { stroke: "#D4A82A", text: "text-[#D4A82A]" },
  rose:  { stroke: "#C4847C", text: "text-[#C4847C]" },
  sage:  { stroke: "#8FA38C", text: "text-[#8FA38C]" },
  coral: { stroke: "#D89789", text: "text-[#D89789]" },
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const R = 44;
const CIRC = 2 * Math.PI * R;

export default function MinimalAudioPlayer({
  title,
  category,
  src,
  accent = "gold",
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [pressed,  setPressed]  = useState(false);

  const color = ACCENTS[accent];
  const progress = duration ? current / duration : 0;
  const dash = CIRC * progress;

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
  }

  return (
    <div
      className="w-full max-w-xs mx-auto select-none"
      style={{ background: "#FAF6F0", padding: "28px 24px 24px" }}
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />

      {/* Category */}
      {category && (
        <p className={`font-caveat text-xs tracking-wide mb-4 ${color.text}`} style={{ opacity: 0.75 }}>
          {category}
        </p>
      )}

      {/* Title */}
      <p className="font-fraunces text-xl text-[#3D2E25] leading-snug mb-7">
        {title}
      </p>

      {/* Circular play button with arc progress */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center" style={{ width: 112, height: 112 }}>
          {/* SVG progress ring */}
          <svg
            width="112" height="112"
            viewBox="0 0 112 112"
            style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
          >
            {/* Track */}
            <circle
              cx="56" cy="56" r={R}
              fill="none"
              stroke="rgba(61,46,37,0.07)"
              strokeWidth="1.5"
            />
            {/* Progress */}
            {duration > 0 && (
              <motion.circle
                cx="56" cy="56" r={R}
                fill="none"
                stroke={color.stroke}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${CIRC}`}
                animate={{ strokeDasharray: `${dash} ${CIRC}` }}
                transition={{ duration: 0.4, ease: "linear" }}
              />
            )}
          </svg>

          {/* Play / pause button */}
          <motion.button
            onPointerDown={() => setPressed(true)}
            onPointerUp={() => setPressed(false)}
            onPointerLeave={() => setPressed(false)}
            onClick={togglePlay}
            animate={{ scale: pressed ? 0.94 : 1 }}
            transition={{ duration: 0.12 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#F5EFE6",
              border: "1px solid rgba(61,46,37,0.10)",
              // single skeuomorphic hint: inner light from top-left
              boxShadow: pressed
                ? "inset 0 1px 3px rgba(61,46,37,0.12)"
                : "0 1px 2px rgba(61,46,37,0.04), 0 2px 6px rgba(61,46,37,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {playing ? (
              // Pause: two thin bars
              <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                <rect x="1"  y="1" width="4" height="14" rx="1.5" fill="#3D2E25" fillOpacity="0.65"/>
                <rect x="9"  y="1" width="4" height="14" rx="1.5" fill="#3D2E25" fillOpacity="0.65"/>
              </svg>
            ) : (
              // Play: single triangle, slightly inset
              <svg width="14" height="16" viewBox="0 0 14 16" fill="none" style={{ marginLeft: 2 }}>
                <path d="M2 1.5L13 8L2 14.5V1.5Z" fill="#3D2E25" fillOpacity="0.65"/>
              </svg>
            )}
          </motion.button>
        </div>

        {/* Skip + time */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 15; }}
            className="font-garamond text-xs text-[#6B5648]/50 hover:text-[#3D2E25] transition-colors"
          >
            −15
          </button>

          <span className="font-garamond text-xs text-[#6B5648]/40 tabular-nums w-20 text-center">
            {fmt(current)} / {duration ? fmt(duration) : "—"}
          </span>

          <button
            onClick={() => { if (audioRef.current) audioRef.current.currentTime += 15; }}
            className="font-garamond text-xs text-[#6B5648]/50 hover:text-[#3D2E25] transition-colors"
          >
            +15
          </button>
        </div>

        {/* Scrubber — fine and minimal */}
        {duration > 0 && (
          <input
            type="range"
            min={0}
            max={duration}
            step={0.5}
            value={current}
            onChange={seek}
            className="w-full appearance-none h-px cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${color.stroke} ${progress * 100}%, rgba(61,46,37,0.10) ${progress * 100}%)`,
              outline: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}
