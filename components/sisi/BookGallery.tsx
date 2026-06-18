"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

// ── Individual book card ────────────────────────────────────────

type BookCardProps = {
  title: string;
  subtitle?: string;
  label?: string;            // small Caveat label (category)
  accent?: "gold" | "rose" | "sage" | "coral" | "plum";
  listened?: boolean;
  locked?: boolean;
  onClick?: () => void;
  index?: number;
};

const SPINE_COLORS = {
  gold:  { spine: "#C49820", cover: "#FAF6F0", label: "#D4A82A" },
  rose:  { spine: "#B0746C", cover: "#FDF6F5", label: "#C4847C" },
  sage:  { spine: "#7A9077", cover: "#F5FAF6", label: "#8FA38C" },
  coral: { spine: "#C48070", cover: "#FDF8F5", label: "#D89789" },
  plum:  { spine: "#2E2019", cover: "#F8F5F2", label: "#3D2E25" },
};

export function BookCard({
  title,
  subtitle,
  label,
  accent = "gold",
  listened = false,
  locked = false,
  onClick,
  index = 0,
}: BookCardProps) {
  const c = SPINE_COLORS[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      onClick={!locked ? onClick : undefined}
      className={`group relative flex flex-col ${locked ? "opacity-50" : onClick ? "cursor-pointer" : ""}`}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Book body */}
      <div
        className="flex-1 relative overflow-hidden transition-all duration-200"
        style={{
          background: c.cover,
          borderLeft: `4px solid ${c.spine}`,
          boxShadow: "0 1px 2px rgba(61,46,37,0.04), 0 2px 6px rgba(61,46,37,0.06)",
        }}
      >
        {/* Hover lift */}
        <motion.div
          className="absolute inset-0"
          whileHover={!locked ? { y: -2 } : undefined}
          transition={{ duration: 0.18 }}
        />

        {/* Cover content */}
        <div className="absolute inset-0 p-3 flex flex-col justify-between">
          {/* Top label */}
          {label && (
            <p className="font-caveat text-xs" style={{ color: c.label, opacity: 0.8 }}>
              {label}
            </p>
          )}

          {/* Title area */}
          <div className="mt-auto">
            <p className="font-fraunces text-sm text-[#3D2E25] leading-snug line-clamp-3">
              {title}
            </p>
            {subtitle && (
              <p className="font-garamond italic text-xs text-[#6B5648]/60 mt-1 line-clamp-2 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Listened mark — top right */}
        {listened && (
          <div className="absolute top-2 right-2">
            <span className="font-caveat text-sm" style={{ color: c.label }}>✓</span>
          </div>
        )}

        {/* Locked mark */}
        {locked && (
          <div
            className="absolute top-2 right-2 px-1.5 py-0.5"
            style={{ background: `${c.spine}18` }}
          >
            <span className="font-garamond text-xs" style={{ color: c.label }}>premium</span>
          </div>
        )}

        {/* Subtle inner top highlight — physical paper suggestion */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "rgba(255,255,255,0.6)" }}
        />
      </div>
    </motion.div>
  );
}

// ── Gallery grid ────────────────────────────────────────────────

type BookGalleryProps = {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  label?: string;
};

export default function BookGallery({ children, cols = 3, label }: BookGalleryProps) {
  const colClass = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[cols];

  return (
    <div>
      {label && (
        <p className="font-garamond text-xs text-[#6B5648]/50 uppercase tracking-widest mb-4">
          {label}
        </p>
      )}
      <div className={`grid ${colClass} gap-3`}>
        {children}
      </div>
    </div>
  );
}
