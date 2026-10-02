"use client";

import { StarGlyph, IconChevronRight } from "./icons";
import type { Surface } from "./buttons";

/** Informative label (not tappable): Still walking · Fulfilled · Resting */
export function StatusChip({
  children,
  surface = "paper",
  tone,
  className = "",
}: {
  children: React.ReactNode;
  surface?: Surface;
  /** "star": a gold dot for Star states */
  tone?: "star";
  className?: string;
}) {
  return (
    <span className={`ds-chip ds-status ${tone ? `ds-status--${tone}` : ""} ${surface === "dark" ? "ds-on-dark" : ""} ${className}`}>
      <span className="ds-status-dot" aria-hidden />
      {children}
    </span>
  );
}

/** Toggle filter: All · Wishes · Signs. Selected uses Sísí Blue. */
export function FilterChip({
  children,
  selected,
  onClick,
  surface = "paper",
  className = "",
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  /** "sky": over the blue Journey/Moments world */
  surface?: Surface | "sky";
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`ds-chip ds-filter ${surface === "dark" ? "ds-on-dark" : surface === "sky" ? "ds-on-sky" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/** A short reply the person can tap instead of typing (the words are theirs, so editorial). */
export function ReplyChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="ds-reply-chip" onClick={onClick}>
      {children}
    </button>
  );
}

/**
 *   Connected to
 *   ✦ Star title
 *     Still walking                 ›
 */
export function StarConnectionRow({
  title,
  status,
  onClick,
  label = "Connected to",
}: {
  title: string;
  status?: string;
  onClick?: () => void;
  label?: string | null;
}) {
  const inner = (
    <>
      <StarGlyph size={18} className="ds-star-row-glyph" />
      <span className="ds-star-row-main">
        <span className="ds-star-row-title">{title}</span>
        {status && <span className="t-meta" style={{ color: "var(--ink-60)" }}>{status}</span>}
      </span>
      {onClick && <IconChevronRight size={20} />}
    </>
  );
  return (
    <div>
      {label && <p className="ds-kicker">{label}</p>}
      {onClick ? (
        <button type="button" className="ds-star-row" onClick={onClick} aria-label={`Visit Star: ${title}`}>
          {inner}
        </button>
      ) : (
        <div className="ds-star-row">{inner}</div>
      )}
    </div>
  );
}
