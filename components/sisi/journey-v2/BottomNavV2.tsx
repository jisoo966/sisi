"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * BottomNavV2 — three warm cream stone-pill tabs.
 *
 * Design (matches mockup "Quiet main journey"):
 *   - Three separated pebble-shaped pills sitting on the world (not one bar)
 *   - Cream #f5efe4 tint with a subtle rice-paper feel
 *   - Labels only, no icons — deliberate quiet
 *   - Active tab: slightly warmer + navy label + tiny bottom shadow suggesting
 *     it's resting on the ground; inactive: soft tint + muted label
 *   - Slides up on mount (spring), matching the world's warm animations
 *
 * Position/size driven by CSS variables (.journey-stage-v2):
 *   --nav-height, --nav-margin, --safe-bottom, --stage-padding
 */

type Theme = "light" | "dark";

const TABS = [
  { key: "journey", href: "/journey",  label: "Journey" },
  { key: "stars",   href: "/my-stars", label: "Stars" },
  { key: "moments", href: "/gallery",  label: "Moments" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function BottomNavV2({
  theme = "light",
  activeTab,
  onStarsSelect,
  onJourneySelect,
}: {
  theme?: Theme;
  /** Override the active pill (the Journey page hosts both the meadow and
   *  the Star World, so the pathname alone can't tell). */
  activeTab?: TabKey;
  /** In the meadow: Stars ascends to the Star World instead of navigating. */
  onStarsSelect?: () => void;
  /** In the Star World: Journey descends back to the meadow. */
  onJourneySelect?: () => void;
}) {
  const pathname = usePathname();
  const isDark = theme === "dark";

  const handlerFor = (key: TabKey) =>
    key === "stars" ? onStarsSelect : key === "journey" ? onJourneySelect : undefined;

  return (
    <motion.nav
      className={`journey-nav ${isDark ? "is-dark" : ""}`}
      aria-label="Primary"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.15 }}
    >
      {TABS.map(({ key, href, label }) => {
        const active = activeTab
          ? activeTab === key
          : pathname === href || pathname?.startsWith(href + "/") || false;
        const handler = handlerFor(key);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`stone-pill ${active ? "is-active" : ""}`}
            onPointerDown={
              handler
                ? (e) => {
                    // Immediate ~90ms press response.
                    const el = e.currentTarget;
                    el.classList.add("is-pressed");
                    setTimeout(() => el.classList.remove("is-pressed"), 90);
                  }
                : undefined
            }
            onClick={
              handler
                ? (e) => {
                    e.preventDefault();
                    handler();
                  }
                : undefined
            }
          >
            {label}
          </Link>
        );
      })}

      <style jsx global>{`
        .journey-nav {
          position: absolute;
          left: max(var(--stage-padding), var(--safe-left));
          right: max(var(--stage-padding), var(--safe-right));
          bottom: calc(var(--safe-bottom) + var(--nav-margin));
          height: var(--nav-height);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(10px, 3vw, 16px);
          z-index: 12;
          pointer-events: none;  /* each pill re-enables its own */
        }
        .stone-pill {
          pointer-events: auto;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 clamp(16px, 5vw, 22px);
          height: clamp(38px, 10vw, 44px);
          /* Pebble-ish shape — 40% side radius reads organic rather than an
             engineered pill. */
          border-radius: 40% / 50%;
          background: #f5efe4;
          color: rgba(31, 42, 68, 0.62);
          font-family: var(--font-sentient), Georgia, serif;
          font-weight: 300;
          letter-spacing: -0.01em;
          font-size: clamp(13px, 3.6vw, 15px);
          line-height: 1;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.75) inset,
            0 6px 14px rgba(28, 35, 64, 0.14);
          transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .stone-pill:hover  { transform: translateY(-1px); }
        .stone-pill:active { transform: translateY(0); }
        .stone-pill.is-pressed {
          transform: scale(0.94);
          transition-duration: 90ms;
        }
        .stone-pill.is-active {
          color: var(--journey-navy);
          background: #ede4d1;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.6) inset,
            0 -1px 0 rgba(28, 35, 64, 0.08) inset,
            0 6px 14px rgba(28, 35, 64, 0.2);
        }
        /* Dark theme (used on My Stars celestial background) */
        .journey-nav.is-dark .stone-pill {
          background: rgba(255, 255, 255, 0.10);
          color: rgba(255, 255, 255, 0.55);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.15) inset,
            0 4px 12px rgba(0, 0, 0, 0.35);
        }
        .journey-nav.is-dark .stone-pill.is-active {
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }
      `}</style>
    </motion.nav>
  );
}
