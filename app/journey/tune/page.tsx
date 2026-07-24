"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { JourneyScene } from "@/components/sisi/JourneyScene";
import { WalkingFoxRear } from "@/components/sisi/WalkingFoxRear";

/**
 * /journey/tune — 여우 walking path 실시간 튜닝 페이지.
 *
 * 슬라이더로 조정 → 실시간 프리뷰 → "copy values" 클릭 → production에 붙여넣기.
 * localStorage에 저장되서 새로고침해도 값 유지.
 */

const STORAGE_KEY = "sisi:fox-tune-v1";

// 현재 production 기본값 (app/journey/page.tsx 232-245)
const DEFAULT_X = [
  -2, -12.5, -11, -9, 6.5, 1.5, -6.5, -6, 12.5, 28.5, -2,
];
const DEFAULT_TIMES = [
  0, 0.097, 0.111, 0.13, 0.273, 0.319, 0.394, 0.398, 0.57, 0.718, 1,
];
const DEFAULT_DURATION = 40;
const DEFAULT_EASE = "linear";

type EaseOption = "linear" | "easeInOut" | "easeOut" | "easeIn";
const EASE_OPTIONS: EaseOption[] = ["linear", "easeInOut", "easeOut", "easeIn"];

export default function TunePage() {
  const [xVals, setXVals] = useState<number[]>(DEFAULT_X);
  const [times, setTimes] = useState<number[]>(DEFAULT_TIMES);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [ease, setEase] = useState<EaseOption>(DEFAULT_EASE);
  const [foxSize, setFoxSize] = useState(180);
  const [foxBottom, setFoxBottom] = useState(210);
  const [showControls, setShowControls] = useState(true);
  const [animKey, setAnimKey] = useState(0);
  const [copied, setCopied] = useState(false);

  // Load saved values
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.xVals) setXVals(saved.xVals);
        if (saved.times) setTimes(saved.times);
        if (saved.duration) setDuration(saved.duration);
        if (saved.ease) setEase(saved.ease);
        if (saved.foxSize) setFoxSize(saved.foxSize);
        if (saved.foxBottom) setFoxBottom(saved.foxBottom);
      }
    } catch {}
  }, []);

  // Save on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ xVals, times, duration, ease, foxSize, foxBottom }),
      );
    } catch {}
  }, [xVals, times, duration, ease, foxSize, foxBottom]);

  function updateX(i: number, v: number) {
    const next = [...xVals];
    next[i] = v;
    setXVals(next);
  }
  function updateTime(i: number, v: number) {
    const next = [...times];
    next[i] = v;
    setTimes(next);
  }

  function resetAll() {
    setXVals(DEFAULT_X);
    setTimes(DEFAULT_TIMES);
    setDuration(DEFAULT_DURATION);
    setEase(DEFAULT_EASE);
    setFoxSize(180);
    setFoxBottom(210);
  }

  function restartAnimation() {
    setAnimKey((k) => k + 1);
  }

  function copyCode() {
    const xLine = xVals.map((v) => `"${v}vw"`).join(", ");
    const tLine = times.map((t) => Number(t.toFixed(4))).join(", ");
    const code = `x: [
  ${xLine}
],
transition: {
  duration: ${duration},
  times: [${tLine}],
  repeat: Infinity,
  ease: "${ease}",
}`;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-black">
      {/* Journey scene background */}
      <JourneyScene />

      {/* Fox with tunable path */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[5]"
        style={{ bottom: `${foxBottom}px` }}
      >
        <motion.div
          key={animKey}
          className="relative"
          animate={{ x: xVals.map((v) => `${v}vw`) }}
          transition={{
            duration,
            times,
            repeat: Infinity,
            ease,
          }}
        >
          <WalkingFoxRear size={foxSize} />
        </motion.div>
      </div>

      {/* Toggle + restart buttons — always visible */}
      <button
        onClick={() => setShowControls((s) => !s)}
        className="fixed top-4 right-4 z-50 rounded-full bg-white/85 backdrop-blur-md border border-white/60 px-4 py-2 text-[13px] font-mono text-journey-navy shadow-md"
      >
        {showControls ? "hide ✕" : "tune ⚙"}
      </button>
      <button
        onClick={restartAnimation}
        className="fixed top-4 right-24 z-50 rounded-full bg-white/85 backdrop-blur-md border border-white/60 px-4 py-2 text-[13px] font-mono text-journey-navy shadow-md"
      >
        restart ↻
      </button>

      {/* Controls panel */}
      {showControls && (
        <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-white/95 backdrop-blur-md border-l border-black/10 overflow-y-auto pt-20 pb-12 px-5 shadow-2xl">
          <h1 className="font-mono text-[16px] text-journey-navy mb-1">
            fox path tuner
          </h1>
          <p className="font-mono text-[11px] text-journey-navy/60 mb-4">
            adjust → preview → copy → paste to app/journey/page.tsx
          </p>

          {/* Duration */}
          <Section title="duration (seconds)">
            <SliderRow
              label="duration"
              value={duration}
              min={15}
              max={90}
              step={1}
              onChange={setDuration}
              format={(v) => `${v}s`}
            />
          </Section>

          {/* Ease */}
          <Section title="ease">
            <div className="flex gap-1.5 flex-wrap">
              {EASE_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEase(e)}
                  className={`font-mono text-[11px] px-3 py-1.5 rounded-md border transition ${
                    ease === e
                      ? "bg-journey-navy text-white border-journey-navy"
                      : "bg-white text-journey-navy border-black/15 hover:bg-black/5"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </Section>

          {/* Fox size + position */}
          <Section title="fox appearance">
            <SliderRow
              label="size"
              value={foxSize}
              min={80}
              max={280}
              step={5}
              onChange={setFoxSize}
              format={(v) => `${v}px`}
            />
            <SliderRow
              label="bottom"
              value={foxBottom}
              min={80}
              max={400}
              step={5}
              onChange={setFoxBottom}
              format={(v) => `${v}px`}
            />
          </Section>

          {/* X positions */}
          <Section title="x positions (vw — 좌우 위치)">
            {xVals.map((v, i) => (
              <SliderRow
                key={`x-${i}`}
                label={`x[${i}]`}
                value={v}
                min={-40}
                max={40}
                step={0.5}
                onChange={(next) => updateX(i, next)}
                format={(v) => `${v}vw`}
              />
            ))}
          </Section>

          {/* Times */}
          <Section title="times (구간별 시간 0.0–1.0)">
            {times.map((t, i) => (
              <SliderRow
                key={`t-${i}`}
                label={`t[${i}]`}
                value={t}
                min={0}
                max={1}
                step={0.005}
                onChange={(next) => updateTime(i, next)}
                format={(v) => v.toFixed(3)}
                disabled={i === 0 || i === times.length - 1}
              />
            ))}
            <p className="font-mono text-[10px] text-journey-navy/50 mt-2">
              first = 0, last = 1 (locked)
            </p>
          </Section>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2 sticky bottom-0 bg-white/95 backdrop-blur-md -mx-5 px-5 py-4 border-t border-black/10">
            <button
              onClick={copyCode}
              className="w-full py-3 rounded-md bg-journey-navy text-white font-mono text-[13px] hover:brightness-110 active:scale-98 transition"
            >
              {copied ? "copied to clipboard" : "copy code"}
            </button>
            <button
              onClick={resetAll}
              className="w-full py-3 rounded-md bg-white text-journey-navy border border-black/15 font-mono text-[12px] hover:bg-black/5 transition"
            >
              reset to defaults
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 pb-5 border-b border-black/8">
      <p className="font-mono text-[12px] text-journey-navy/70 uppercase tracking-wider mb-2.5">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${disabled ? "opacity-40" : ""}`}>
      <span className="font-mono text-[11px] text-journey-navy w-10 shrink-0">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-journey-navy"
      />
      <span className="font-mono text-[10px] text-journey-navy/70 w-14 shrink-0 text-right tabular-nums">
        {format(value)}
      </span>
    </div>
  );
}
