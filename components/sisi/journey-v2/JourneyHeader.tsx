"use client";

import { motion } from "framer-motion";
import { IconButton, IconLandscape, IconMenu } from "@/components/ds";
import { markHint } from "@/lib/hints";

/**
 * JourneyHeader — minimal, quiet header per mockup "Quiet main journey".
 *
 * No date or greeting: the sky stays the world's, and Sísí greets you
 * herself when you arrive (her bubble, in Journey).
 *
 * Right cluster:
 *   Just a plain outline bell (no glass frame). Optional dot badge for
 *   nudges. Menu is optional and lives further behind — kept for now via
 *   an unobtrusive three-line icon underneath the bell if provided.
 *
 * Positioning entirely via world variables (globals.css):
 *   top: --header-top, px: --stage-padding
 *
 * Fades in from the top on mount so the world feels like it arrives with
 * a soft breath rather than a page load.
 */

type Props = {
  isDark: boolean;
  hasNudge: boolean;
  /** @deprecated notifications moved into the menu */
  onBellClick?: () => void;
  onMenuClick: () => void;
  /** Capture a Moment or Sign (hidden during focused sessions). */
  onCameraClick?: () => void;
  /** Open the satchel (optional customization drawer). */
  onSatchelClick?: () => void;
  /** @deprecated the tool is pointed out by Sísí at the first Starlight (no name label) */
  showNames?: boolean;
};

export function JourneyHeader({
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
      {/* no words up here: the sky is the world's (Sísí greets you herself).
          The two quiet tools sit one in each top corner, balancing the sky:
          the menu at the left, customizing the world at the right. Capturing,
          the main action, lives at the bottom within the thumb's reach. */}
      <div className="left-col">
        <span className="menu-wrap">
          <IconButton quiet surface="dark" label="Menu" className="menu-btn" onClick={onMenuClick}>
            <IconMenu />
          </IconButton>
          {hasNudge && <span className="nudge-dot" aria-hidden />}
        </span>
      </div>

      <div className="right-col">
        {onSatchelClick && (
          <span className="tool-wrap">
            <IconButton
              quiet
              surface="dark"
              label="Map"
              className="satchel-btn"
              onClick={() => {
                markHint("customize");
                onSatchelClick();
              }}
            >
              {/* the Map: where you walk */}
              <IconLandscape />
            </IconButton>
          </span>
        )}
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
          color: var(--on-sky); /* the sky's colour rule (ds.css) */
          transition: color 4s ease;
        }
        :global(.journey-header.is-dark) { color: var(--paper-90); }

        .left-col { min-width: 0; flex: 1 1 auto; display: flex; margin-left: -10px; }
        .left-col :global(.ds-icon-btn) { color: var(--on-sky); transition: color 4s ease, opacity var(--motion-instant) ease, transform var(--motion-instant) ease; }
        .right-col :global(.ds-icon-btn) { color: var(--on-sky); transition: color 4s ease, opacity var(--motion-instant) ease, transform var(--motion-instant) ease; }
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
