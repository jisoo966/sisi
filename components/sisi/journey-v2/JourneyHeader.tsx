"use client";

import { motion } from "framer-motion";

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

      {/* Quiet secondary tools, stacked top-right (master reference):
          camera = capture a Moment or Sign · menu = account & settings.
          satchel = optional customization drawer. */}
      <div className="right-col">
        {onCameraClick && (
          <button type="button" onClick={onCameraClick} aria-label="Capture a moment" className="disc-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
          </button>
        )}
        {onSatchelClick && (
          <button type="button" onClick={onSatchelClick} aria-label="Open your satchel" className="disc-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
              <path d="M5.5 8h13l-1 11.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5z" />
              <path d="M10 12.5h4" />
            </svg>
          </button>
        )}
        <button type="button" onClick={onMenuClick} aria-label="Menu" className="disc-btn disc-btn--quiet">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="6" y1="8" x2="18" y2="8" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="6" y1="16" x2="18" y2="16" />
          </svg>
          {hasNudge && <span className="nudge-dot" />}
        </button>
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
          color: var(--journey-navy);
        }
        :global(.journey-header.is-dark) { color: rgba(255, 255, 255, 0.95); }

        .left-col {
          min-width: 0;
          flex: 1 1 auto;
        }
        .date-line {
          font-family: var(--font-fraunces), Georgia, serif;
          font-weight: 400;
          font-size: var(--date-size);
          line-height: 1;
          margin: 0 0 10px 0;
          opacity: 0.7;
          letter-spacing: 0.01em;
        }
        :global(.journey-header.is-dark) .date-line { opacity: 0.85; }

        .greeting-line {
          font-family: var(--font-fraunces), Georgia, serif;
          font-weight: 400;
          font-size: var(--greeting-size);
          line-height: 1.2;
          margin: 0;
          letter-spacing: -0.005em;
        }
        .name-italic {
          font-style: italic;
        }
        .soft-dot {
          /* the trailing period stays upright — italic period visually drifts */
          font-style: normal;
        }

        .right-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .disc-btn {
          position: relative;
          width: var(--icon-btn-size);
          height: var(--icon-btn-size);
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: rgba(247, 242, 227, 0.92);
          color: #2b2f45;
          box-shadow: 0 2px 8px rgba(20, 30, 60, 0.18);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s ease;
        }
        .disc-btn:active { transform: scale(0.94); }
        /* Account & settings: present but quieter than the two tools. */
        .disc-btn--quiet {
          width: calc(var(--icon-btn-size) * 0.8);
          height: calc(var(--icon-btn-size) * 0.8);
          background: rgba(247, 242, 227, 0.6);
          box-shadow: none;
        }
        .disc-btn svg { width: 52%; height: 52%; }

        .nudge-dot {
          position: absolute;
          top: 20%;
          right: 22%;
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #d18a5b;
          border: 1px solid rgba(245, 239, 228, 0.9);
        }
      `}</style>
    </motion.header>
  );
}
