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
  onBellClick: () => void;
  onMenuClick: () => void;
};

export function JourneyHeader({
  dateStr,
  greeting,
  name,
  isDark,
  hasNudge,
  onBellClick,
  onMenuClick,
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

      <div className="right-col">
        <button
          type="button"
          onClick={onBellClick}
          aria-label="Notifications"
          className="line-icon-btn"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {hasNudge && <span className="nudge-dot" />}
        </button>

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Menu"
          className="line-icon-btn menu-btn"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
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
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .line-icon-btn {
          position: relative;
          width: var(--icon-btn-size);
          height: var(--icon-btn-size);
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          opacity: 0.75;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
          transition: opacity 0.2s ease, transform 0.15s ease;
        }
        .line-icon-btn:hover  { opacity: 1; transform: translateY(-1px); }
        .line-icon-btn:active { transform: translateY(0); }
        .line-icon-btn svg {
          width: 55%;
          height: 55%;
        }
        .menu-btn { display: none; }
        /* Only show the hamburger on larger phones where two icons fit
           comfortably. Keeps small screens ultra-clean per mockup. */
        @media (min-width: 380px) {
          .menu-btn { display: inline-flex; }
        }

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
