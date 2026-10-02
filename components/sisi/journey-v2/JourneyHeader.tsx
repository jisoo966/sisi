"use client";

import { motion } from "framer-motion";
import { IconButton, IconCustomize, IconMenu } from "@/components/ds";

/**
 * JourneyHeader — minimal, quiet header per mockup "Quiet main journey".
 *
 * Left column:
 *   "Mon, May 12"          small serif date
 *   "Good morning, you."   larger italic serif greeting
 *
 * Right cluster:
 *   Just a plain outline bell (no glass frame). Optional dot badge for
 *   nudges. Menu is optional and lives further behind — kept for now via
 *   an unobtrusive three-line icon underneath the bell if provided.
 *
 * Positioning entirely via world variables (globals.css):
 *   top: --header-top, px: --stage-padding
 * Fluid typography: --date-size, --greeting-size.
 *
 * Fades in from the top on mount so the world feels like it arrives with
 * a soft breath rather than a page load.
 */

type Props = {
  dateStr: string;
  greeting: string;
  name: string;
  isDark: boolean;
  hasNudge: boolean;
  /** @deprecated notifications moved into the menu */
  onBellClick?: () => void;
  onMenuClick: () => void;
  /** Capture a Moment or Sign (hidden during focused sessions). */
  onCameraClick?: () => void;
  /** Open the satchel (optional customization drawer). */
  onSatchelClick?: () => void;
};

export function JourneyHeader({
  dateStr,
  greeting,
  name,
  isDark,
  hasNudge,
  onMenuClick,
  onCameraClick,
  onSatchelClick,
}: Props) {
  return (
    <motion.header
      className={`journey-header ${isDark ? "is-dark" : ""}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="left-col">
        <p className="date-line">{dateStr}</p>
        <h1 className="greeting-line">
          {greeting ? (
            <>
              {greeting},<br />
              <span className="name-italic">{name || "you"}</span>
              <span className="soft-dot">.</span>
            </>
          ) : null}
        </h1>
      </div>

      {/* Quiet secondary tools, one row top-right: customize · menu (the
          rarest — in the corner). Capturing, the main action, lives at the
          bottom within the thumb's reach (CaptureFAB). */}
      <div className="right-col">
        {onSatchelClick && (
          <IconButton quiet surface="dark" label="Open your satchel" onClick={onSatchelClick}>
            <IconCustomize />
          </IconButton>
        )}
        <span className="menu-wrap">
          <IconButton quiet surface="dark" label="Menu" className="menu-btn" onClick={onMenuClick}>
            <IconMenu />
          </IconButton>
          {hasNudge && <span className="nudge-dot" aria-hidden />}
        </span>
      </div>

      <style jsx>{`
        :global(.journey-header) {
          position: absolute;
          top: var(--header-top);
          left: max(var(--stage-padding), var(--safe-left));
          right: max(var(--stage-padding), var(--safe-right));
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          z-index: 12;
          color: var(--sisi-ink);
        }
        :global(.journey-header.is-dark) { color: var(--paper-90); }

        .left-col { min-width: 0; flex: 1 1 auto; }
        /* the date is functional metadata (Inter); the greeting is Sísí's voice */
        .date-line {
          font-family: var(--font-ui);
          font-weight: 500;
          font-size: var(--text-meta);
          line-height: var(--leading-meta);
          margin: 0 0 8px 0;
          color: var(--ink-80);
          letter-spacing: 0.01em;
        }
        :global(.journey-header.is-dark) .date-line { color: var(--paper-80); }
        .greeting-line {
          font-family: var(--font-editorial);
          font-weight: 400;
          /* quieter than the display size: 26–30px (≈27px on a 390px phone) */
          font-size: clamp(26px, 6.9vw, 30px);
          line-height: 1.08;
          margin: 0;
          letter-spacing: -0.03em; /* -3% */
        }
        .name-italic { font-style: italic; }
        /* the trailing period stays upright — an italic period visually drifts */
        .soft-dot { font-style: normal; }
        /* quiet tools: one row, 44px targets, ~45px between centres */
        .right-col { display: flex; flex-direction: row; align-items: center; gap: 1px; flex-shrink: 0; margin-right: -10px; }
        .menu-wrap { position: relative; display: inline-flex; }
        .nudge-dot {
          position: absolute; top: 10px; right: 10px; width: 6px; height: 6px; border-radius: 9999px;
          background: var(--sisi-coral); border: 1px solid var(--paper-90); pointer-events: none;
        }
      `}</style>
    </motion.header>
  );
}
