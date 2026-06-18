"use client";

import { ReactNode, useMemo } from "react";
import { motion } from "framer-motion";

const SIZES = {
  sm: 32,
  md: 48,
  lg: 64,
} as const;

const COLORS: Record<string, { bg: string; border: string; shadow: string }> = {
  gold:  { bg: "#D4A82A", border: "#FAF6F0", shadow: "rgba(212,168,42,0.25)" },
  rose:  { bg: "#C4847C", border: "#FAF6F0", shadow: "rgba(196,132,124,0.25)" },
  sage:  { bg: "#8FA38C", border: "#FAF6F0", shadow: "rgba(143,163,140,0.25)" },
  plum:  { bg: "#3D2E25", border: "#FAF6F0", shadow: "rgba(61,46,37,0.30)" },
  coral: { bg: "#D89789", border: "#FAF6F0", shadow: "rgba(216,151,137,0.25)" },
};

type StickerProps = {
  children: ReactNode;
  variant?: keyof typeof COLORS;
  size?: keyof typeof SIZES;
  /** Fixed rotation in degrees. If omitted, random −5..5 on mount. */
  rotation?: number;
  /** Make it round (default) or square */
  shape?: "circle" | "square";
  onClick?: () => void;
  className?: string;
};

export default function Sticker({
  children,
  variant = "gold",
  size = "md",
  rotation,
  shape = "circle",
  onClick,
  className = "",
}: StickerProps) {
  const rot = useMemo(
    () => rotation ?? (Math.random() * 10 - 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const px = SIZES[size];
  const color = COLORS[variant];
  const radius = shape === "circle" ? "50%" : "4px";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82, rotate: rot - 4 }}
      animate={{ opacity: 1, scale: 1, rotate: rot }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        scale: 1.07,
        rotate: rot - 1.5,
        y: -3,
        transition: { duration: 0.18, ease: "easeOut" },
      }}
      onClick={onClick}
      className={`inline-flex items-center justify-center select-none ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        width: px,
        height: px,
        minWidth: px,
        minHeight: px,
        borderRadius: radius,
        backgroundColor: color.bg,
        border: `3px solid ${color.border}`,
        boxShadow: `0 1px 2px rgba(61,46,37,0.10), 0 2px 8px rgba(61,46,37,0.08), 0 0 0 1px ${color.shadow}`,
        // Subtle inner paper feel
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E\")",
        backgroundSize: "128px 128px",
        backgroundRepeat: "repeat",
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          fontSize: px * 0.46,
          lineHeight: 1,
          color: color.border,
          userSelect: "none",
        }}
      >
        {children}
      </span>
    </motion.div>
  );
}
