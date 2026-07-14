"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * JourneyMusic — *조용한* ambient sound toggle.
 *
 * Behavior:
 *   - 기본: 음소거 (사용자가 의도적으로 켜야 함, 자동재생 정책 존중)
 *   - 토글 선택은 *localStorage에 저장* → 다음 방문 시 재현
 *   - 음악 없으면 *graceful degrade* (버튼만 비활성)
 *   - 페이드 인/아웃으로 *부드럽게* 켜고 꺼짐
 *
 * 음악 파일:
 *   /public/audio/ambient.mp3 (또는 .ogg)
 *   추천: 60~120bpm 미만, 멜로디보다 *texture* 위주
 *   (Brian Eno · Hammock · thatgamecompany Journey OST 스타일)
 */

const STORAGE_KEY = "sisi-music-on";

export function JourneyMusic({
  src = "/audio/ambient.mp3",
  initialVolume = 0.4,
}: {
  src?: string;
  initialVolume?: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);
  const [mounted, setMounted] = useState(false);

  // SSR/client 일치를 위해 mount 후에만 audio + interactive 렌더
  useEffect(() => {
    setMounted(true);
  }, []);

  // 이전 선택 복원
  useEffect(() => {
    if (!mounted) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "on" && audioRef.current) {
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }, [mounted]);

  function toggle() {
    if (!audioRef.current) return;
    if (playing) {
      // 부드럽게 페이드아웃
      fadeOut(audioRef.current, () => {
        audioRef.current?.pause();
        setPlaying(false);
        if (typeof window !== "undefined")
          localStorage.setItem(STORAGE_KEY, "off");
      });
    } else {
      audioRef.current.volume = 0;
      audioRef.current
        .play()
        .then(() => {
          fadeIn(audioRef.current!, initialVolume);
          setPlaying(true);
          if (typeof window !== "undefined")
            localStorage.setItem(STORAGE_KEY, "on");
        })
        .catch(() => setAvailable(false));
    }
  }

  // SSR에서는 placeholder (호버·클릭 불가). client mount 후 실제 audio 등장
  if (!mounted) {
    return (
      <div
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/40 text-journey-navy/40 shadow-sm"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>
    );
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="none"
        onError={() => setAvailable(false)}
      />

      <motion.button
        onClick={toggle}
        aria-label={playing ? "Pause ambient sound" : "Play ambient sound"}
        disabled={!available}
        whileTap={{ scale: 0.9 }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/40 text-journey-navy/80 shadow-sm hover:bg-white/60 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {playing ? (
          // playing — 4개 막대 (음파 느낌)
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="9" width="3" height="6" rx="1.5" />
            <rect x="10" y="6" width="3" height="12" rx="1.5" />
            <rect x="16" y="9" width="3" height="6" rx="1.5" />
          </svg>
        ) : (
          // muted — 작은 음표
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}
      </motion.button>
    </>
  );
}

// ~1초 동안 부드럽게 페이드
function fadeIn(audio: HTMLAudioElement, target = 0.4, durationMs = 1200) {
  const steps = 30;
  let i = 0;
  const id = setInterval(() => {
    i++;
    audio.volume = Math.min(target, (i / steps) * target);
    if (i >= steps) clearInterval(id);
  }, durationMs / steps);
}

function fadeOut(audio: HTMLAudioElement, onDone: () => void, durationMs = 800) {
  const start = audio.volume;
  const steps = 20;
  let i = 0;
  const id = setInterval(() => {
    i++;
    audio.volume = Math.max(0, start * (1 - i / steps));
    if (i >= steps) {
      clearInterval(id);
      onDone();
    }
  }, durationMs / steps);
}
