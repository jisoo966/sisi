"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * StickerNavigation — the one navigation: Moments / Journey / Stars.
 *
 * Three hand-drawn crayon marks with live labels, resting on the world (no
 * bar, no backing). The order is the timeline: the past (Moments) · the
 * present (Journey, home) · the future (Stars). Switching never slides the
 * page; each destination plays its own in-world transition via the optional
 * handlers.
 *
 * Warm ivory on the Journey and Moments (dark grass where the marks rest);
 * deep blue-green ink on Stars (the bright cloud bank) and on paper. Default 58% · selected 100%, lifted 2px, with
 * a short hand-drawn underline · pressed 0.92 for 90ms · disabled 25%.
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

/** Monochrome, filled, slightly irregular marks (32×32, currentColor). */
const ICONS: Record<(typeof TABS)[number]["key"], React.ReactNode> = {
  // two overlapping memory cards with a tiny Star stamp
  moments: <path fillRule="evenodd" d="M4.61 22.1Q5.84 21.97 5.76 20.8Q5.69 19.63 5.56 18.54Q5.43 17.46 5.35 16.43Q5.27 15.4 5.27 14.43Q5.27 13.47 5.26 12.56Q5.25 11.66 5.29 10.81Q5.35 9.97 5.39 9.18Q5.44 8.38 5.53 7.64Q5.61 6.88 4.67 6.77Q3.72 6.66 3.63 7.42Q3.53 8.16 3.45 8.98Q3.36 9.8 3.23 10.68Q3.12 11.56 3.07 12.5Q3.02 13.45 3.06 14.45Q3.11 15.44 3.07 16.52Q3.02 17.59 3.15 18.72Q3.29 19.85 3.35 21.04Q3.4 22.24 4.61 22.1ZM4.27 6.4Q4.53 7.63 5.48 7.42Q6.43 7.2 7.36 6.94Q8.29 6.68 9.22 6.49Q10.15 6.31 11.09 6.19Q12.03 6.07 12.95 5.98Q13.89 5.89 14.83 5.83Q15.76 5.77 16.7 5.75Q17.64 5.73 18.62 5.75Q19.58 5.78 19.63 4.96Q19.67 4.13 18.69 4.09Q17.71 4.04 16.72 4Q15.74 3.96 14.76 3.99Q13.78 4.03 12.8 4.04Q11.82 4.04 10.84 4.17Q9.87 4.3 8.91 4.44Q7.94 4.56 6.96 4.68Q5.97 4.8 4.99 4.98Q4.01 5.16 4.27 6.4ZM8.53 9.59Q8.77 7.97 10.32 7.82Q11.88 7.66 13.58 7.6Q15.28 7.53 17.05 7.48Q18.82 7.44 20.49 7.85Q22.16 8.26 23.78 8.39Q25.4 8.51 27.09 8.52Q28.78 8.53 28.94 10.15Q29.1 11.77 29.29 13.55Q29.48 15.31 29.03 17.25Q28.59 19.17 28.77 21.09Q28.95 23 28.85 24.88Q28.75 26.76 28.26 28.18Q27.77 29.59 26.24 29.7Q24.72 29.81 23.1 29.97Q21.47 30.12 19.72 29.95Q17.96 29.78 16.18 29.82Q14.4 29.87 12.9 29.38Q11.42 28.89 9.58 28.99Q7.75 29.09 7.67 27.41Q7.59 25.73 7.55 23.94Q7.52 22.14 7.87 20.28Q8.22 18.43 8 16.54Q7.78 14.66 8.04 12.93Q8.31 11.22 8.53 9.59ZM10.74 11.6Q10.82 13.1 10.58 14.38Q10.35 15.66 10.4 17.09Q10.45 18.51 10.47 19.86Q10.51 21.22 10.49 22.55Q10.47 23.88 10.21 25.42Q9.96 26.96 11.27 27.07Q12.59 27.2 14.09 26.87Q15.6 26.54 16.84 26.55Q18.08 26.55 19.4 26.93Q20.71 27.3 22.13 27.55Q23.57 27.8 24.96 27.88Q26.35 27.96 26.32 26.42Q26.3 24.89 26.13 23.34Q25.94 21.8 25.98 20.44Q26 19.08 26.14 17.7Q26.28 16.32 26.35 14.93Q26.41 13.54 26.75 11.87Q27.09 10.21 25.56 10.36Q24.04 10.5 22.66 10.64Q21.26 10.77 19.97 10.89Q18.69 11.01 17.36 10.64Q16.03 10.27 14.69 10.21Q13.33 10.15 12 10.12Q10.66 10.1 10.74 11.6ZM18.73 14.55L19.79 17.4L22.62 18.08L20.17 19.41L20.83 22.11L18.49 20.72L15.59 22.05L16.72 19.29L14.38 17.28L17.65 17.32Z" />,
  // two paw prints walking on — Sísí's walk (drawn on the 24 grid). Paws are
  // airy, so they're scaled to fill the box like the other marks and given a
  // hair of extra weight (a thin same-colour stroke) to match their presence.
  journey: <path transform="translate(0.6 -0.3) scale(1.4)" stroke="currentColor" strokeWidth={0.45} strokeLinejoin="round" d="M5 20.4Q4.6 20 4.4 19.4Q4.3 18.9 4.2 18.4Q4.2 17.8 4.4 17.3Q4.5 16.8 4.7 16.4Q5 16 5.7 15.9Q6.5 15.8 7.1 15.3Q7.6 14.9 8.1 15Q8.6 15 9 15.3Q9.5 15.5 9.9 15.8Q10.3 16.2 10.6 16.7Q10.9 17.2 10.9 17.8Q10.8 18.4 10.6 18.9Q10.3 19.5 9.9 19.8Q9.5 20 9 20.2Q8.6 20.4 8.1 20.7Q7.6 20.9 7.1 21Q6.7 21.1 6.1 20.9Q5.5 20.8 5 20.4ZM1.4 14.9Q1.9 14.7 2.4 14.9Q2.9 15.2 3.1 15.8Q3.2 16.3 2.8 16.8Q2.5 17.2 1.9 17.3Q1.3 17.3 1 16.8Q0.6 16.3 0.7 15.8Q0.8 15.2 1.4 14.9ZM2.8 11.7Q3.5 11.4 4 11.8Q4.6 12.1 4.7 12.7Q4.9 13.3 4.5 13.8Q4.1 14.4 3.4 14.4Q2.8 14.4 2.4 13.9Q1.9 13.3 2.1 12.7Q2.2 12 2.8 11.7ZM5.8 10.5Q6.4 10.2 7 10.5Q7.6 10.7 7.8 11.4Q7.9 12 7.5 12.5Q7.1 13 6.4 13Q5.8 13 5.4 12.5Q5 12 5.1 11.4Q5.3 10.7 5.8 10.5ZM9.2 11.4Q9.7 11.1 10.2 11.4Q10.7 11.7 10.9 12.3Q11 12.8 10.6 13.3Q10.3 13.8 9.7 13.8Q9.1 13.8 8.7 13.3Q8.3 12.9 8.5 12.3Q8.6 11.7 9.2 11.4ZM14.4 9.3Q14.3 8.9 14.3 8.4Q14.4 8 14.5 7.7Q14.7 7.3 15.4 6.8Q16 6.4 16.5 6.6Q17.1 6.9 17.6 6.8Q18.1 6.7 18.7 7.3Q19.2 7.9 19.3 8.2Q19.4 8.6 19.4 9.1Q19.4 9.5 19.1 9.9Q18.9 10.2 18.5 10.5Q18.2 10.8 17.4 10.8Q16.6 10.8 15.9 10.5Q15.2 10.3 14.9 10Q14.6 9.7 14.4 9.3ZM13.6 4.4Q14 4.2 14.4 4.4Q14.8 4.6 14.9 5Q15 5.5 14.7 5.8Q14.4 6.1 14 6.2Q13.6 6.2 13.3 5.8Q13 5.5 13.1 5Q13.1 4.6 13.6 4.4ZM15.7 3Q16.2 2.8 16.6 3Q17.1 3.1 17.2 3.6Q17.3 4.1 17 4.5Q16.7 4.9 16.2 4.9Q15.7 4.9 15.4 4.5Q15.1 4.1 15.2 3.7Q15.3 3.2 15.7 3ZM18.2 3.2Q18.6 3 19.1 3.2Q19.6 3.5 19.7 3.9Q19.8 4.4 19.5 4.8Q19.1 5.2 18.6 5.2Q18.2 5.2 17.9 4.8Q17.6 4.4 17.7 3.9Q17.8 3.5 18.2 3.2ZM20 5.2Q20.4 5 20.8 5.2Q21.3 5.4 21.3 5.8Q21.4 6.2 21.2 6.6Q20.9 7 20.4 6.9Q20 6.9 19.7 6.6Q19.5 6.2 19.6 5.8Q19.7 5.4 20 5.2Z" />,
  // one asymmetric eight-point wish Star
  stars: <path d="M15.65 5.01L17.9 12.6L25.84 9.99L20.75 15.19L28.65 17.78L20.81 18.75L24.46 25.17L17.44 21.81L15.03 30.6L13.84 21.44L7.42 23.28L11.54 17.97L6.76 16.14L11.69 14.95L9.94 8.88L14.02 12.17Z" />,
};
const UNDERLINE = "M1.99 4.17Q2.05 4.63 3.19 4.63Q4.34 4.64 5.45 4.57Q6.57 4.49 7.68 4.54Q8.78 4.59 9.9 4.63Q11.01 4.67 12.12 4.7Q13.23 4.74 14.34 4.91Q15.45 5.09 16.58 5.19Q17.7 5.3 18.82 5.4Q19.93 5.51 21.06 5.32Q22.19 5.14 23.33 5.21Q24.47 5.28 25.61 5.39Q26.75 5.5 27.89 5.4Q29.03 5.29 30.17 5.05Q31.32 4.82 32.46 4.71Q33.6 4.6 34.72 4.34Q35.83 4.08 36.95 3.75Q38.08 3.41 37.99 2.97Q37.91 2.53 36.79 2.67Q35.66 2.81 34.54 2.8Q33.42 2.8 32.3 2.73Q31.18 2.67 30.08 2.66Q28.97 2.66 27.86 2.66Q26.75 2.67 25.64 2.47Q24.53 2.27 23.42 2.18Q22.31 2.09 21.18 2.16Q20.06 2.22 18.93 2.23Q17.81 2.24 16.68 2.11Q15.55 1.97 14.41 2.14Q13.27 2.3 12.13 2.24Q10.99 2.19 9.85 2.31Q8.71 2.42 7.57 2.64Q6.43 2.86 5.3 3.01Q4.16 3.16 3.05 3.44Q1.93 3.71 1.99 4.17Z";

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
  /** the marks rest on paper (e.g. the Moments list): draw them in ink */
  onPaper?: boolean;
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
  onPaper = false,
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
      className={`ds-nav journey-nav${current === "stars" || onPaper ? " is-ink" : ""}${still ? " is-still" : ""}${dock === "sky" ? " is-sky" : ""}${
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
            <svg className="ds-nav-icon" viewBox="0 0 32 32" fill="currentColor" aria-hidden focusable="false">
              {ICONS[key]}
            </svg>
            <span className="ds-nav-label">{label}</span>
            <svg className="ds-nav-underline" viewBox="0 0 40 7" fill="currentColor" aria-hidden focusable="false">
              <path d={UNDERLINE} />
            </svg>
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
