"use client";

import { useEffect, useRef, useState } from "react";

/**
 * PondFish — now and then, a fish (Bridge & Pond theme).
 *
 * A calm pond, never a school: fish slip in from the left one by one and
 * swim slowly across, the way Sísí is walking, in 10–16s; the next comes
 * 4–9s later, so 2–3 are in view (three at most). Each
 * rises and falls 2–4px over 3–5s. Coral or ivory; now and then a smaller,
 * paler one further off (nearer the bridge).
 *
 * Only the open water below the bridge: above the near bank's grass tips and
 * below the piles' feet (19.2% of the ground box, less a fish's height).
 * Reduced motion: no fish swim by.
 */

type Props = {
  srcs: string[];
  /** the ground box's bottom (the fish depths are measured in it) */
  bottom: string;
  /** (kept for callers; the calm pond's fish swim on their own) */
  waterSpeed?: number;
  waterDrift?: number;
};

type Swimmer = { id: number; src: string; w: number; depth: number; dur: number; delay: number; opacity: number; bob: number; bobS: number };

const MAX_AT_ONCE = 3;
const between = (a: number, b: number) => a + Math.random() * (b - a);

export function PondFish({ srcs, bottom }: Props) {
  const [fish, setFish] = useState<Swimmer[]>([]);
  const seq = useRef(0);
  const srcsRef = useRef(srcs);
  srcsRef.current = srcs;

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    /** midway: already partway across (s into its crossing), for the pond you arrive at */
    const add = (midway = 0) =>
      setFish((list) => {
        if (list.length >= MAX_AT_ONCE || document.hidden) return list;
        const far = Math.random() < 0.25;
        const s = srcsRef.current;
        return [
          ...list,
          {
            id: ++seq.current,
            src: s[Math.floor(Math.random() * s.length)],
            w: Math.round(far ? between(20, 26) : between(32, 44)),
            depth: far ? between(15.6, 16.8) : between(12.4, 15),
            dur: between(10, 16),
            delay: -midway,
            opacity: far ? 0.78 : 1,
            bob: between(2, 4),
            bobS: between(3, 5),
          },
        ];
      });
    // one every 4–9s while each takes 10–16s to cross: usually 2–3 in view,
    // now and then a moment of open water
    const next = () => {
      t = setTimeout(() => {
        add();
        next();
      }, between(4000, 9000));
    };
    // arriving, the pond already has two on their way (one further along)
    add(between(3, 5));
    add(between(0, 1));
    next();
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pf-box" style={{ bottom }} aria-hidden>
      {fish.map((f) => (
        <span
          key={f.id}
          className="pf-fish"
          style={{ bottom: `${f.depth.toFixed(2)}%`, width: f.w, animationDuration: `${f.dur.toFixed(1)}s`, animationDelay: `${f.delay.toFixed(1)}s` }}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setFish((list) => list.filter((x) => x.id !== f.id));
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={f.src}
            alt=""
            draggable={false}
            style={
              {
                opacity: f.opacity, // (on the picture: the crossing fades the fish in and out)
                animationDuration: `${f.bobS.toFixed(2)}s`,
                ["--bob" as string]: `${f.bob.toFixed(1)}px`,
              } as React.CSSProperties
            }
          />
        </span>
      ))}
      <style jsx global>{`
        /* the ground's box: as tall as the stage, resting where the ground rests */
        .pf-box { position: absolute; left: 0; right: 0; height: 100%; pointer-events: none; overflow: hidden; z-index: 3; }
        /* the art faces right: slowly across, the way Sísí walks */
        .pf-fish {
          position: absolute; left: 0; display: block; aspect-ratio: 2 / 1; will-change: transform;
          animation: pf-cross linear 1 both;
        }
        @keyframes pf-cross {
          from { transform: translateX(-60px); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          to { transform: translateX(calc(100vw + 20px)); opacity: 0; }
        }
        .pf-fish img { display: block; width: 100%; height: 100%; animation: pf-bob ease-in-out infinite alternate; }
        @keyframes pf-bob { from { translate: 0 calc(var(--bob) / -2); rotate: -1.5deg; } to { translate: 0 calc(var(--bob) / 2); rotate: 1.5deg; } }
      `}</style>
    </div>
  );
}
