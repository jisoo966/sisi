"use client";

import { useEffect, useRef } from "react";

/**
 * BackgroundMusic — 앱 전체에서 재생되는 ambient sound.
 *
 * Menu sheet의 토글이 localStorage("sisi-music-on")을 바꾸고,
 * "sisi:music-toggle" 이벤트를 dispatch하면 여기서 감지해서 play/pause.
 *
 * 앱 mount 시 localStorage에 "on" 있으면 자동 재생 (자동재생 정책 상 실패할 수도 있음 — silent).
 */
export function BackgroundMusic({
  src = "/audio/ambient.mp3",
  volume = 0.4,
}: {
  src?: string;
  volume?: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initial load — 만약 저장된 상태가 on이면 시도
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sisi-music-on");
    if (saved === "on" && audioRef.current) {
      audioRef.current.volume = 0;
      audioRef.current
        .play()
        .then(() => {
          if (audioRef.current) fadeIn(audioRef.current, volume);
        })
        .catch(() => {
          // Autoplay blocked — user needs to interact first (menu toggle)
        });
    }
  }, [volume]);

  // Listen to toggle events from MenuSheet
  useEffect(() => {
    if (typeof window === "undefined") return;
    function handler(e: Event) {
      const audio = audioRef.current;
      if (!audio) return;
      const detail = (e as CustomEvent<{ on: boolean }>).detail;
      if (detail.on) {
        audio.volume = 0;
        audio
          .play()
          .then(() => fadeIn(audio, volume))
          .catch(() => {
            /* browser blocked */
          });
      } else {
        fadeOut(audio, () => audio.pause());
      }
    }
    window.addEventListener("sisi:music-toggle", handler);
    return () => window.removeEventListener("sisi:music-toggle", handler);
  }, [volume]);

  return (
    <audio ref={audioRef} src={src} loop preload="none" style={{ display: "none" }} />
  );
}

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
