"use client";

import { useEffect, useState } from "react";

/**
 * useVideoLuminance — 배경 video의 *현재 밝기* 감지.
 *
 * Canvas로 video의 top 영역을 주기적으로 sampling해서
 * 평균 luminance를 계산. dark scene이면 "dark" 반환.
 *
 * 사용:
 *   const mode = useVideoLuminance();
 *   const textColor = mode === "dark" ? "text-white" : "text-journey-navy";
 */

export type BgMode = "light" | "dark";

export function useVideoLuminance(
  options?: {
    /** Video DOM selector — default 'video' */
    selector?: string;
    /** Threshold (0-255). 낮을수록 dark 판정 엄격 */
    darkThreshold?: number;
    /** Sampling interval (ms) */
    intervalMs?: number;
    /** Top region ratio to sample (0-1). Top-heavy for header text */
    topRegionRatio?: number;
  },
): BgMode {
  const {
    selector = "video",
    darkThreshold = 105,
    intervalMs = 400,
    topRegionRatio = 0.35,
  } = options ?? {};

  const [mode, setMode] = useState<BgMode>("light");

  useEffect(() => {
    // Small offscreen canvas for luminance sampling
    const canvas = document.createElement("canvas");
    canvas.width = 60;
    canvas.height = 60;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // *Smoothing* — 갑작스러운 flicker 방지. Rolling average.
    const history: number[] = [];
    const historySize = 3;

    const sample = () => {
      const video = document.querySelector(
        selector,
      ) as HTMLVideoElement | null;
      if (!video || video.readyState < 2) return;

      try {
        ctx.drawImage(video, 0, 0, 60, 60);
        const topHeight = Math.round(60 * topRegionRatio);
        const imageData = ctx.getImageData(0, 0, 60, topHeight);
        const data = imageData.data;
        const pixels = data.length / 4;

        let totalLum = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Perceived luminance (Rec. 709)
          totalLum +=
            0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        }
        const avg = totalLum / pixels;

        history.push(avg);
        if (history.length > historySize) history.shift();
        const smoothed = history.reduce((a, b) => a + b, 0) / history.length;

        setMode(smoothed < darkThreshold ? "dark" : "light");
      } catch (err) {
        // CORS 등 예외는 조용히 skip
      }
    };

    // 최초 sampling + interval
    sample();
    const id = setInterval(sample, intervalMs);
    return () => clearInterval(id);
  }, [selector, darkThreshold, intervalMs, topRegionRatio]);

  return mode;
}
