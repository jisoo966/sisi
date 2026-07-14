"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * FoxCharacter — Sísí 캐릭터의 모든 state를 통합 관리.
 *
 * 사용:
 *   <FoxCharacter state="walking" size={180} />
 *   <FoxCharacter state="listening" size={120} />
 *
 * State 자산 (public/fox/):
 *   walking-clean.webp   — 걷는 모션 (animated, transparent)
 *   sitting-front-small.png — 작은 정면 좌상 (chat avatar)
 *   sitting-front-tall.png  — 큰 정면 좌상 (photo pose)
 *   side-profile-1.png      — 측면 1 (mid-conversation)
 *   side-profile-2.png      — 측면 2 (idle cycle)
 *   walking-away.png        — 뒷모습 (continue walking transition)
 *   sleeping-curled.png     — 잠자는 자세 (밤 모드) [선택]
 *
 * Animation:
 *   - Static state: 미세한 brething (scale 1↔1.02, 4s loop)
 *   - State 전환: 600ms crossfade
 */

export type FoxState =
  | "walking"
  | "sittingSmall"
  | "sittingTall"
  | "sideProfile1"
  | "sideProfile2"
  | "walkingAway"
  | "sleeping";

const FOX_ASSETS: Record<FoxState, { src: string; isAnimated: boolean }> = {
  walking: { src: "/fox/walking-clean.webp", isAnimated: true },
  sittingSmall: { src: "/fox/sitting-front-small.png", isAnimated: false },
  sittingTall: { src: "/fox/sitting-front-tall.png", isAnimated: false },
  sideProfile1: { src: "/fox/side-profile-1.png", isAnimated: false },
  sideProfile2: { src: "/fox/side-profile-2.png", isAnimated: false },
  walkingAway: { src: "/fox/walking-away.png", isAnimated: false },
  sleeping: { src: "/fox/sleeping-curled.png", isAnimated: false },
};

type Props = {
  state: FoxState;
  size?: number | string;
  className?: string;
  /** static state에 미세한 brething 애니메이션 줄지 (기본 true) */
  breathing?: boolean;
  /** 떠다니는 느낌 (기본 false) */
  floating?: boolean;
};

export function FoxCharacter({
  state,
  size = 180,
  className = "",
  breathing = true,
  floating = false,
}: Props) {
  const asset = FOX_ASSETS[state];
  const sizeStyle =
    typeof size === "number"
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  return (
    <div
      className={`relative pointer-events-none ${className}`}
      style={sizeStyle}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={state}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            scale: breathing && !asset.isAnimated ? [1, 1.02, 1] : 1,
            y: floating ? [0, -4, 0] : 0,
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.6, ease: "easeInOut" },
            scale: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            },
            y: floating
              ? { duration: 5, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0 },
          }}
          className="absolute inset-0"
        >
          <img
            src={asset.src}
            alt="Sísí fox"
            className="w-full h-full object-contain"
            onError={(e) => {
              // 자산이 아직 없으면 walking-clean.webp로 fallback (있을 가능성 높음)
              const img = e.currentTarget;
              if (!img.src.endsWith("walking-clean.webp")) {
                img.src = "/fox/walking-clean.webp";
              }
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * useFoxState — 자동으로 fox state cycle 돌리는 hook
 *
 * 예:
 *   const state = useFoxState({
 *     states: ["sideProfile1", "sideProfile2"],
 *     intervalMs: 4000,
 *   });
 *   return <FoxCharacter state={state} />
 */
export function useFoxState(opts: {
  states: FoxState[];
  intervalMs?: number;
}): FoxState {
  const [index, setIndex] = useState(0);
  const interval = opts.intervalMs ?? 5000;

  useEffect(() => {
    if (opts.states.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % opts.states.length);
    }, interval);
    return () => clearInterval(id);
  }, [opts.states.length, interval]);

  return opts.states[index];
}
