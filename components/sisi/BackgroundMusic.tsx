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

  // BackgroundMusic is the only thing that knows whether audio is actually
  // playing. MenuSheet's toggle previously trusted localStorage alone, so a
  // blocked autoplay (the default on first visit — browsers require a user
  // gesture before playing audio) left the menu showing "ON" while nothing
  // played; tapping it just silently turned an already-silent player "off".
  // Announcing the real state lets MenuSheet stay in sync with reality.
  function announce(on: boolean) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sisi:music-state", { detail: { on } }),
      );
    }
  }

  // Initial load — 기본 ON (사용자가 explicit off 안 했으면). Autoplay is
  // usually blocked here (no user gesture yet) — that's expected.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sisi-music-on");
    const shouldPlay = saved !== "off"; // null or "on" → play
    if (shouldPlay && audioRef.current) {
      audioRef.current.volume = 0;
      audioRef.current
        .play()
        .then(() => {
          if (audioRef.current) fadeIn(audioRef.current, volume);
          announce(true);
        })
        .catch(() => {
          // Autoplay blocked — user needs to interact first (menu toggle)
          announce(false);
        });
    } else {
      announce(false);
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
          .then(() => {
            fadeIn(audio, volume);
            announce(true);
          })
          .catch(() => {
            /* browser blocked */
            announce(false);
          });
      } else {
        fadeOut(audio, () => audio.pause());
        announce(false);
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
