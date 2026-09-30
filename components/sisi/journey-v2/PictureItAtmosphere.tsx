"use client";

import { FX } from "@/lib/fxAssets";

/**
 * PictureItAtmosphere — the full-screen breathing world behind Picture it.
 * Never inside the Star: it is its own fixed ritual root, above the night
 * sky and below the Star, the words and the controls.
 *
 *   ritual root   position: fixed; inset: 0; overflow: hidden; isolation: isolate
 *   1 breathing   inset −15%, 130% × 130%: the halo as a wide blue-ivory wash
 *                 spreading from the Star (inhale 0.94 → 1.08, 0.22 → 0.48;
 *                 exhale → 0.97, 0.25), then a quiet 0.12 for the prompts
 *   2 mist        the bottom ~40%, 0.14–0.25, drifting; rises ~12px on exhale
 *   2 particles   a few grains drift outward on inhale, settle on exhale,
 *                 and keep an extremely slow drift afterwards
 *
 * One sine-like ease everywhere; no flash, no hard circular edge.
 * Reduced motion: opacity only.
 */

export type AtmospherePhase = "open" | "in" | "out" | "after";

/** where the Star's centre is (matches .sms-screen.is-ritual .sms-scroll) */
const STAR_CY = "calc(max(calc(var(--safe-top) + 32px), calc(21dvh - 44px)) + 44px)";

// a few grains, placed once (percent of the screen), each drifting away from the Star
const GRAINS = Array.from({ length: 16 }, (_, i) => {
  const x = ((i * 37 + 11) % 86) + 7;
  const y = ((i * 53 + 17) % 70) + 6;
  // direction away from the Star (50%, ~21%), screen is ~2.2× taller than wide
  const vx = x - 50;
  const vy = (y - 21) * 2.2;
  const len = Math.hypot(vx, vy) || 1;
  return {
    x,
    y,
    dx: (vx / len) * 12,
    dy: (vy / len) * 12,
    size: 3 + (i % 3),
    src: FX.ambient.dust[i % 3],
    float: 18 + (i % 5) * 3,
    delay: -((i * 7) % 20),
  };
});

export function PictureItAtmosphere({ phase }: { phase: AtmospherePhase }) {
  return (
    <div className={`pia-root is-${phase}`} aria-hidden>
      {/* 1 · full-screen breathing atmosphere */}
      <div className="pia-breath">
        <div className="pia-breath-motion">
          <div className="pia-glow" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pia-wash" src="/sisi-assets/picture-it/breathing-star-halo.webp" alt="" draggable={false} />
        </div>
      </div>
      {/* 2 · drifting mist and particles */}
      <div className="pia-mist">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sisi-assets/picture-it/dream-mist-overlay.webp" alt="" draggable={false} />
      </div>
      <div className="pia-grains">
        {GRAINS.map((g, i) => (
          <span
            key={i}
            className="pia-grain"
            style={{ left: `${g.x}%`, top: `${g.y}%`, ["--dx" as string]: `${g.dx.toFixed(1)}px`, ["--dy" as string]: `${g.dy.toFixed(1)}px` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.src}
              alt=""
              draggable={false}
              style={{ width: g.size, height: g.size, animationDuration: `${g.float}s`, animationDelay: `${g.delay}s` }}
            />
          </span>
        ))}
      </div>
      <style jsx global>{`
        /* the ritual root: the whole screen, nothing leaks out */
        .pia-root {
          position: fixed; inset: 0; overflow: hidden; isolation: isolate; z-index: 0; pointer-events: none;
          --pia-ease: cubic-bezier(0.37, 0, 0.63, 1);
          --pia-star-cy: ${STAR_CY};
          animation: pia-in 1200ms var(--pia-ease) both;
        }
        @keyframes pia-in { from { opacity: 0; } to { opacity: 1; } }

        /* 1 · breathing layer — outside the Star, larger than the screen */
        .pia-breath {
          position: absolute; inset: -15%; width: 130%; height: 130%;
          pointer-events: none; overflow: visible; z-index: 1;
        }
        .pia-breath-motion {
          position: absolute; inset: 0;
          /* it breathes from the Star: the origin sits on the Star's centre */
          transform-origin: 50% calc(var(--pia-star-cy) + 15dvh);
          transform: scale(0.94); opacity: 0.22;
          transition: transform 1.2s var(--pia-ease), opacity 1.2s var(--pia-ease);
          will-change: transform, opacity;
        }
        .pia-root.is-in .pia-breath-motion { transform: scale(1.08); opacity: 0.48; transition-duration: 4s; }
        .pia-root.is-out .pia-breath-motion { transform: scale(0.97); opacity: 0.25; transition-duration: 6s; }
        /* prompts: the large breathing stops; the atmosphere stays, quietly */
        .pia-root.is-after .pia-breath-motion { transform: scale(0.97); opacity: 0.12; transition-duration: 3s; }
        /* a soft blue-ivory glow spreading from the Star — no edge anywhere */
        .pia-glow {
          position: absolute; inset: 0;
          background: radial-gradient(
            ellipse 70% 55% at 50% calc(var(--pia-star-cy) + 15dvh),
            rgba(250, 246, 232, 0.55) 0%, rgba(214, 226, 246, 0.32) 28%, rgba(170, 192, 230, 0.12) 55%, rgba(170, 192, 230, 0) 78%
          );
        }
        /* the supplied halo as a wide wash (~110vw), feathered so it never shows a circle */
        .pia-wash {
          position: absolute; left: 50%; top: calc(var(--pia-star-cy) + 15dvh);
          width: 110vw; height: 110vw; max-width: none; translate: -50% -50%;
          opacity: 0.9;
          -webkit-mask-image: radial-gradient(circle, #000 30%, rgba(0, 0, 0, 0.5) 50%, transparent 70%);
          mask-image: radial-gradient(circle, #000 30%, rgba(0, 0, 0, 0.5) 50%, transparent 70%);
        }

        /* 2 · mist across the bottom ~40% */
        .pia-mist {
          position: absolute; left: -8%; right: -8%; bottom: 0; height: 40%; z-index: 2; pointer-events: none;
          transform: translateY(0); transition: transform 6s var(--pia-ease);
        }
        .pia-root.is-out .pia-mist, .pia-root.is-after .pia-mist { transform: translateY(-12px); }
        .pia-mist img {
          position: absolute; left: 0; bottom: 0; width: 100%; height: 100%; max-width: none; object-fit: cover; object-position: 50% 100%;
          opacity: 0.2; animation: pia-mist 16s var(--pia-ease) infinite alternate;
        }
        @keyframes pia-mist {
          0% { transform: translate(0, 0); opacity: 0.14; }
          50% { opacity: 0.25; }
          100% { transform: translate(18px, -5px); opacity: 0.18; }
        }

        /* 2 · particles: outward on the inhale, settling on the exhale */
        .pia-grains { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
        .pia-grain {
          position: absolute; display: block; opacity: 0.55;
          transform: translate(0, 0); transition: transform 1.2s var(--pia-ease);
        }
        .pia-root.is-in .pia-grain { transform: translate(var(--dx), var(--dy)); transition-duration: 4s; }
        .pia-root.is-out .pia-grain, .pia-root.is-after .pia-grain { transform: translate(0, 0); transition-duration: 6s; }
        /* always alive: an extremely slow drift */
        .pia-grain img { display: block; max-width: none; animation: pia-float 20s var(--pia-ease) infinite alternate; }
        @keyframes pia-float { 0% { transform: translate(0, 0); } 100% { transform: translate(5px, -7px); } }

        html.app-hidden .pia-root * { animation-play-state: paused !important; }
        @media (prefers-reduced-motion: reduce) {
          /* opacity only — no scaling, no drifting */
          .pia-breath-motion, .pia-root[class] .pia-breath-motion { transform: none !important; }
          .pia-root[class] .pia-mist, .pia-root[class] .pia-grain { transform: none !important; }
          .pia-mist img, .pia-grain img { animation: none; }
        }
      `}</style>
    </div>
  );
}
