"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Lazy load Lottie (heavy library — only load when component renders)
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

type FoxLottieProps = {
  /** Path to Lottie JSON, e.g. "/lottie/fox-walking.json" */
  src?: string;
  /** Width/height in px or CSS unit */
  size?: number | string;
  /** Loop animation (default: true) */
  loop?: boolean;
  /** Play speed (default: 1.0) */
  speed?: number;
  /** Extra className */
  className?: string;
};

/**
 * FoxLottie — renders a Lottie animation of the fox.
 *
 * Usage:
 *   <FoxLottie src="/lottie/fox-walking.json" size={200} />
 *
 * If src is not provided OR the Lottie file fails to load,
 * shows a fallback (static image with subtle bounce).
 */
export function FoxLottie({
  src = "/lottie/fox-walking.json",
  size = 200,
  loop = true,
  speed = 1.0,
  className = "",
}: FoxLottieProps) {
  const [animationData, setAnimationData] = useState<unknown | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setFailed(true);
      return;
    }
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load Lottie");
        return r.json();
      })
      .then((data) => setAnimationData(data))
      .catch(() => setFailed(true));
  }, [src]);

  // Fallback — static image with subtle walking bounce
  if (failed || !animationData) {
    return (
      <div
        className={`relative ${className}`}
        style={{
          width: typeof size === "number" ? `${size}px` : size,
          height: typeof size === "number" ? `${size}px` : size,
        }}
      >
        <img
          src="/journey/ChatSiSiProfile.png"
          alt="fox"
          className="w-full h-full object-contain animate-fox-walk"
          style={{
            animation: "fox-walk 0.6s ease-in-out infinite",
          }}
        />
        <style jsx>{`
          @keyframes fox-walk {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={true}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
      }}
      className={className}
      // @ts-expect-error speed is not in types but works
      speed={speed}
    />
  );
}
