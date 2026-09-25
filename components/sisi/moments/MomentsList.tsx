"use client";

import { useMemo, useState } from "react";
import { monthLabel } from "@/lib/moments";
import type { Placed } from "@/lib/momentsTimeline";

/**
 * MomentsList — the practical way to search or jump to a month.
 * Warm ivory paper over the world; grouped by month; compact rows with an
 * occasional small photo; a tiny gold dot marks a Star-linked Moment.
 * Picking a row returns to the Memory Trail and walks to that Moment.
 */

/** Torn along the top only; sides and bottom stay clean. */
const EDGE = (() => {
  const pts: string[] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const j = Math.abs((Math.sin(i * 12.9898 + 88 * 7.13) * 43758.5453) % 1);
    pts.push(`${((i / n) * 100).toFixed(2)}% ${(j * 9).toFixed(1)}px`);
  }
  return `polygon(${pts.join(", ")}, 100% 100%, 0% 100%)`;
})();

export function MomentsList({ placed, onPick }: { placed: Placed[]; onPick: (index: number) => void }) {
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const today = new Date().toDateString();
    const out: { label: string; rows: Placed[] }[] = [];
    placed.forEach((p) => {
      const it = p.item;
      const text = it.type === "rest" ? `a star at rest ${it.star.wish}` : it.text;
      const m = monthLabel(it.at);
      if (needle && !`${text} ${m}`.toLowerCase().includes(needle)) return;
      const label = new Date(it.at).toDateString() === today ? "Today" : m;
      const g = out[out.length - 1];
      if (g && g.label === label) g.rows.push(p);
      else out.push({ label, rows: [p] });
    });
    return out;
  }, [placed, q]);

  return (
    <section className="ml-sheet paper-bg" style={{ clipPath: EDGE }} aria-label="Moments list">
      <div className="ml-scroll">
        <label className="ml-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 20 20" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your moments…" aria-label="Search your moments" />
        </label>

        {groups.length === 0 && <p className="ml-empty">{q ? "Nothing here with those words." : "Your moments will gather here as you walk."}</p>}

        {groups.map((g) => (
          <div key={g.label} className="ml-group">
            <h2 className="ml-month">{g.label}</h2>
            {g.rows.map((p) => {
              const it = p.item;
              const d = new Date(it.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <button key={p.key} type="button" className="ml-row" onClick={() => onPick(p.index)}>
                  {it.type === "moment" && it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="ml-thumb" src={it.image} alt="" loading="lazy" />
                  ) : (
                    <span className="ml-thumb ml-thumb--none" aria-hidden />
                  )}
                  <span className="ml-body">
                    <span className="ml-date">
                      {d}
                      {it.type === "moment" && it.starId && <i className="ml-dot" aria-label="connected to a Star" />}
                    </span>
                    <span className="ml-text">
                      {it.type === "rest" ? (
                        <>
                          <em>A Star at Rest · </em>
                          {it.star.wish}
                        </>
                      ) : (
                        it.text
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <style jsx global>{`
        .ml-sheet {
          position: absolute; z-index: 20; left: 0; right: 0; bottom: 0;
          top: calc(var(--header-top) + 64px);
          color: #2b2f45;
        }
        .ml-scroll {
          position: absolute; inset: 0; overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch;
          padding: 26px var(--stage-padding) calc(var(--nav-total) + 28px);
          touch-action: pan-y;
        }
        .ml-search {
          display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 16px; border-radius: 999px;
          background: rgba(43, 47, 69, 0.06); color: rgba(43, 47, 69, 0.6);
        }
        .ml-search svg { width: 19px; height: 19px; flex: 0 0 auto; }
        .ml-search input {
          flex: 1; min-width: 0; border: 0; background: transparent; outline: none; color: #2b2f45;
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px;
        }
        .ml-search input::placeholder { color: rgba(43, 47, 69, 0.45); }
        .ml-empty { margin: 28px 4px; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; color: rgba(43, 47, 69, 0.55); }
        .ml-group { margin-top: 22px; }
        .ml-month { margin: 0 0 4px; font-family: var(--font-fraunces), Georgia, serif; font-weight: 400; font-size: 22px; }
        .ml-row {
          display: flex; gap: 14px; align-items: flex-start; width: 100%; padding: 12px 0; border: 0;
          border-bottom: 1px solid rgba(43, 47, 69, 0.1); background: transparent; text-align: left; cursor: pointer; color: inherit;
        }
        .ml-group .ml-row:last-child { border-bottom: 0; }
        .ml-thumb { flex: 0 0 76px; width: 76px; height: 54px; object-fit: cover; border-radius: 2px; display: block; }
        .ml-thumb--none { height: 1px; }
        .ml-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .ml-date { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 13px; color: rgba(43, 47, 69, 0.55); }
        .ml-dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #d4a82a; }
        .ml-text {
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; line-height: 1.3;
        }
        .ml-text em { font-style: italic; color: rgba(43, 47, 69, 0.65); }
      `}</style>
    </section>
  );
}
