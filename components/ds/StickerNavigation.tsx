"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * StickerNavigation — the one navigation: Moments / Journey / Stars.
 *
 * Three paper stickers resting on the world (no bar, no icons). The order is
 * the timeline: the past (Moments) · the present (Journey, home) · the future
 * (Stars). Switching never slides the page; each destination plays its own
 * in-world transition via the optional handlers.
 *
 * While any ModalPortal / FocusPaper is open the nav dims and ignores input
 * (html.ds-overlay-open in ds.css) and stays beneath the backdrop.
 */

const TABS = [
  { key: "moments", href: "/gallery", label: "Moments" },
  { key: "journey", href: "/journey", label: "Journey" },
  // From other pages, Stars returns to the Journey and ascends there.
  { key: "stars", href: "/journey?to=stars", label: "Stars" },
] as const;

export type NavTab = (typeof TABS)[number]["key"];

export type StickerNavigationProps = {
  /** kept for older callers; the stickers look the same on every surface */
  theme?: "light" | "dark";
  /** Override the selected sticker (the Journey page hosts both meadow and Star World). */
  activeTab?: NavTab;
  onStarsSelect?: () => void;
  onJourneySelect?: () => void;
  onMomentsSelect?: () => void;
  /** Arriving from another tab: don't replay the entrance. */
  still?: boolean;
  /** Selected state for assistive tech when it changes ahead of the visual. */
  ariaTab?: NavTab;
  /** "sky": the quieter Sky Dock over the Star World. */
  dock?: "ground" | "sky";
  quiet?: "clear" | "dim" | "detail";
  onWake?: () => void;
};

export function StickerNavigation({
  activeTab,
  onStarsSelect,
  onJourneySelect,
  onMomentsSelect,
  still = false,
  ariaTab,
  dock = "ground",
  quiet = "clear",
  onWake,
}: StickerNavigationProps) {
  const pathname = usePathname();
  const handlerFor = (key: NavTab) =>
    key === "stars" ? onStarsSelect : key === "journey" ? onJourneySelect : onMomentsSelect;

  const inferred: NavTab | undefined =
    pathname?.startsWith("/gallery") || pathname?.startsWith("/moment")
      ? "moments"
      : pathname?.startsWith("/my-stars")
        ? "stars"
        : pathname?.startsWith("/journey")
          ? "journey"
          : undefined;
  const current = activeTab ?? inferred;

  return (
    <nav
      className={`ds-nav journey-nav${still ? " is-still" : ""}${dock === "sky" ? " is-sky" : ""}${
        dock === "sky" && quiet !== "clear" ? ` is-${quiet}` : ""
      }`}
      onFocusCapture={onWake}
      aria-label="Primary"
    >
      {TABS.map(({ key, href, label }) => {
        const active = current === key;
        const handler = handlerFor(key);
        return (
          <Link
            key={key}
            href={href}
            aria-current={(ariaTab ? ariaTab === key : active) ? "page" : undefined}
            className={`ds-nav-tab ds-nav-tab--${key}${active ? " is-active" : ""}`}
            onPointerDown={(e) => {
              const el = e.currentTarget;
              el.classList.add("is-pressed");
              setTimeout(() => el.classList.remove("is-pressed"), 90);
            }}
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
    </nav>
  );
}

/** The navigation on pages outside the Journey stage (fixed to the bottom). */
export function StickerNavigationHost({ className = "", ...p }: StickerNavigationProps & { className?: string }) {
  return (
    <div className={`ds-nav-host journey-nav-host ${className}`}>
      <StickerNavigation {...p} />
    </div>
  );
}
