"use client";

import { useEffect } from "react";
import { IconButton } from "./buttons";
import { IconClose } from "./icons";
import { ModalPortal } from "./modal";

/**
 * Sísí paper — three surfaces only.
 *   SisiSpeechBubble  short companion speech      (components/sisi/SisiSpeechBubble)
 *   MemoryPaper       Moments, affirmations, Star notes, timeline entries
 *   FocusPaper        conversation, writing, Star practice, expanded detail
 */

/* ── MemoryPaper ────────────────────────────────────────────────────── */

export function MemoryPaper({
  as = "div",
  onClick,
  ariaLabel,
  compact,
  meta,
  title,
  text,
  image,
  imageAlt = "",
  children,
  className = "",
  style,
}: {
  as?: "div" | "article" | "button" | "li";
  onClick?: () => void;
  ariaLabel?: string;
  compact?: boolean;
  /** small functional line (date, status) — Inter */
  meta?: React.ReactNode;
  title?: React.ReactNode;
  /** the content — never truncated */
  text?: React.ReactNode;
  /** only rendered when present; no space is reserved otherwise */
  image?: string | null;
  imageAlt?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Tag = (onClick ? "button" : as) as "div";
  return (
    <Tag
      className={`ds-memory ${compact ? "ds-memory--compact" : ""} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      style={style}
      {...(onClick ? { type: "button" } : {})}
    >
      <div className="ds-memory-sheet ds-paper">
        {meta && <div className="ds-memory-meta">{meta}</div>}
        {title && <h3 className="ds-memory-title" style={meta ? { marginTop: 6 } : undefined}>{title}</h3>}
        {text && <p className="ds-memory-text">{text}</p>}
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ds-memory-image" src={image} alt={imageAlt} loading="lazy" />
        )}
        {children}
      </div>
    </Tag>
  );
}

/* ── FocusPaper ─────────────────────────────────────────────────────── */

/** Keeps a bottom sheet above the on-screen keyboard (visualViewport). */
export function useKeyboardInset(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const root = document.documentElement.style;
    const update = () => {
      // (in development on a computer, the test keyboard reports its own height)
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop, Number(document.documentElement.dataset.devKb || 0));
      root.setProperty("--ds-kb", `${Math.round(kb)}px`);
      document.documentElement.classList.toggle("kb-open", kb > 40);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      if (!document.documentElement.dataset.devKb) {
        root.removeProperty("--ds-kb");
        document.documentElement.classList.remove("kb-open");
      }
    };
  }, [active]);
}

export function FocusPaper({
  open,
  onClose,
  title,
  titleId,
  headerExtra,
  footer,
  children,
  tall = false,
  dismissible = true,
  closeLabel = "Close",
  className = "",
  bodyRef,
  decoration,
  onBodyScroll,
  live = false,
}: {
  /** the world behind stays fully visible (no dim or blur) — for live previews */
  live?: boolean;
  /** drawn on the paper's top edge (e.g. Sísí resting on it) */
  decoration?: React.ReactNode;
  onBodyScroll?: () => void;
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  titleId?: string;
  /** e.g. an OverflowMenu, placed before the close button */
  headerExtra?: React.ReactNode;
  /** fixed input or actions */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** always the full 78dvh (conversation) rather than content height */
  tall?: boolean;
  dismissible?: boolean;
  closeLabel?: string;
  className?: string;
  bodyRef?: React.Ref<HTMLDivElement>;
}) {
  useKeyboardInset(open);
  return (
    <ModalPortal open={open} onClose={onClose} variant="sheet" dismissible={dismissible} labelledBy={titleId} backdrop={live ? "clear" : "dim"}>
      <section
        className={`ds-focus ds-paper ${tall ? "ds-focus--tall" : ""} ${className}`}
        style={{ bottom: "var(--ds-kb, 0px)", maxHeight: "min(78dvh, calc(100dvh - var(--safe-top) - 24px - var(--ds-kb, 0px)))" }}
      >
        {decoration}
        <span className="ds-focus-grip" aria-hidden />
        <header className="ds-focus-head">
          {typeof title === "string" ? <h2 id={titleId} className="ds-focus-title">{title}</h2> : <div className="ds-focus-title">{title}</div>}
          {headerExtra}
          <IconButton label={closeLabel} onClick={onClose}>
            <IconClose />
          </IconButton>
        </header>
        <div className="ds-focus-body" ref={bodyRef} onScroll={onBodyScroll}>{children}</div>
        {footer && <div className="ds-focus-foot">{footer}</div>}
      </section>
    </ModalPortal>
  );
}
