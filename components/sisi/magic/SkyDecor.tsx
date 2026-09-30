"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * SkyDecor — the Star sky grows quietly with Starlight.
 *
 *   0–9     5–8 faint background stars
 *   10–24   a few more
 *   25–49   + a faint path of small stars
 *   50–99   + more depth, an occasional gentle glint
 *   100+    + a very rare, subtle shooting star
 *
 * Decorative stars are small, dim ivory and never interactive; the user's
 * own Stars stay larger, warm golden and tappable. Positions are generated
 * from a fixed seed, so every star keeps its place between sessions (new
 * ones only ever join). Negative space is kept: nothing in the central
 * column where the Star path walks, few stars overall. No galaxy, no
 * constellations, no astrology.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Dot = { x: number; y: number; r: number; o: number };

/** The full, stable field; the balance decides how many are shown. */
const FIELD: Dot[] = (() => {
  const next = rng(0x5151);
  const out: Dot[] = [];
  while (out.length < 34) {
    const x = next();
    const y = next() * 0.9;
    // keep the central column (the Star path) open
    if (x > 0.34 && x < 0.66) continue;
    out.push({ x, y, r: 0.6 + next() * 0.9, o: 0.22 + next() * 0.3 });
  }
  return out;
})();

/** a faint, gently curving path of small stars (upper left → right) */
const PATH: Dot[] = Array.from({ length: 9 }, (_, i) => {
  const t = i / 8;
  return { x: 0.06 + t * 0.26, y: 0.52 - Math.sin(t * Math.PI) * 0.1 + t * 0.12, r: 0.55, o: 0.18 + (i % 3) * 0.05 };
});

function visibleCount(balance: number): number {
  if (balance < 10) return 5 + Math.min(3, Math.floor(balance / 3)); // 5–8
  if (balance < 25) return 12;
  if (balance < 50) return 16;
  if (balance < 100) return 24;
  return 30;
}

export function SkyDecor({ balance, active = true }: { balance: number; active?: boolean }) {
  const dots = useMemo(() => FIELD.slice(0, visibleCount(balance)), [balance]);
  const path = balance >= 25;
  const glints = balance >= 50;
  const shooting = balance >= 100;

  // an occasional glint (50+): one existing star brightens softly
  const [glintAt, setGlintAt] = useState<number | null>(null);
  useEffect(() => {
    if (!glints || !active) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        if (document.visibilityState === "visible") setGlintAt(Math.floor(Math.random() * dots.length));
        setTimeout(() => setGlintAt(null), 1600);
        next();
      }, 7000 + Math.random() * 7000);
    };
    next();
    return () => clearTimeout(t);
  }, [glints, active, dots.length]);

  // a very rare shooting star (100+)
  const [shot, setShot] = useState<number>(0);
  useEffect(() => {
    if (!shooting || !active) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        if (document.visibilityState === "visible" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setShot((n) => n + 1);
        next();
      }, 60000 + Math.random() * 90000);
    };
    next();
    return () => clearTimeout(t);
  }, [shooting, active]);

  return (
    <div className="sky-decor" aria-hidden>
      {dots.map((d, i) => (
        <span
          key={i}
          className={`sky-decor-dot${glintAt === i ? " is-glint" : ""}`}
          style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: d.r * 2, height: d.r * 2, opacity: d.o }}
        />
      ))}
      {path &&
        PATH.map((d, i) => (
          <span key={`p${i}`} className="sky-decor-dot is-path" style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: d.r * 2, height: d.r * 2, opacity: d.o }} />
        ))}
      {shot > 0 && <span key={shot} className="sky-decor-shoot" />}
      <style jsx global>{`
        .sky-decor { position: absolute; inset: 0; pointer-events: none; }
        .sky-decor-dot {
          position: absolute; border-radius: 50%; background: var(--sisi-paper);
          transition: opacity 1.2s ease, transform 1.2s ease;
          animation: sky-decor-in 2.4s ease both;
        }
        .sky-decor-dot.is-glint { opacity: 0.85 !important; transform: scale(1.8); box-shadow: 0 0 4px 1px rgba(245, 239, 221, 0.35); }
        @keyframes sky-decor-in { from { opacity: 0; } }
        .sky-decor-shoot {
          position: absolute; left: 72%; top: 14%; width: 70px; height: 1px;
          background: linear-gradient(to left, rgba(245, 239, 221, 0.7), rgba(245, 239, 221, 0));
          transform: rotate(-24deg); transform-origin: right center; opacity: 0;
          animation: sky-decor-shoot 1.1s ease-out 1 both;
        }
        @keyframes sky-decor-shoot {
          0% { opacity: 0; translate: 0 0; }
          20% { opacity: 0.8; }
          100% { opacity: 0; translate: -120px 52px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sky-decor-dot { animation: none; transition: opacity 1.2s ease; }
          .sky-decor-dot.is-glint { transform: none; }
        }
      `}</style>
    </div>
  );
}
