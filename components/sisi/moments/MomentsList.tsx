"use client";

import { useMemo } from "react";
import { isRealPhoto, monthLabel } from "@/lib/moments";
import { TYPE_LABEL } from "@/lib/momentStore";
import type { Placed } from "@/lib/momentsTimeline";

/**
 * MomentsList — browsing memories by date.
 * Warm ivory torn paper over the world; grouped by month; typographic rows,
 * with a small thumbnail only when the Moment holds a real photo; a tiny
 * gold dot marks a Star-linked Moment. The search field lives in the
 * Moments header (it opens only when asked for); `query` filters here by
 * Moment text, the connected Star, the date / month and the reflection type.
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

/** Everything a person might type to find a Moment. */
function haystack(p: Placed): string {
  const it = p.item;
  const d = new Date(it.at);
  const dates = [
    monthLabel(it.at),
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    d.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    d.toLocaleDateString("en-US", { weekday: "long" }),
    new Date().toDateString() === d.toDateString() ? "today" : "",
  ].join(" ");
  if (it.type === "rest") return `a star at rest ${it.star.wish} ${dates}`;
  return [it.text, it.starTitle ?? "", TYPE_LABEL[it.mtype] ?? "", it.kind === "small_step" ? "a small step" : "", dates].join(" ");
}

export function MomentsList({
  placed,
  onPick,
  query = "",
}: {
  placed: Placed[];
  onPick: (index: number) => void;
  query?: string;
}) {
  const q = query;
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const today = new Date().toDateString();
    const out: { label: string; rows: Placed[] }[] = [];
    placed.forEach((p) => {
      const it = p.item;
      const m = monthLabel(it.at);
      if (needle && !haystack(p).toLowerCase().includes(needle)) return;
      const label = new Date(it.at).toDateString() === today ? "Today" : m;
      const g = out[out.length - 1];
      if (g && g.label === label) g.rows.push(p);
      else out.push({ label, rows: [p] });
    });
    return out;
  }, [placed, q]);

  return (
    <section className="ml-sheet ds-paper ds-paper--memory" style={{ clipPath: EDGE }} aria-label="Moments list">
      <div className="ml-scroll ds-scroll">
        {groups.length === 0 && <p className="ml-empty">{q.trim() ? "Nothing here with those words yet." : "Your Moments will gather here as you walk."}</p>}

        {groups.map((g) => (
          <div key={g.label} className="ml-group">
            <h2 className="ml-month t-card-title">{g.label}</h2>
            {g.rows.map((p) => {
              const it = p.item;
              const d = new Date(it.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <button key={p.key} type="button" className="ml-row" onClick={() => onPick(p.index)}>
                  {it.type === "moment" && isRealPhoto(it.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="ml-thumb" src={it.image} alt="" loading="lazy" />
                  ) : null}
                  <span className="ml-body">
                    {it.type === "moment" && it.starTitle && (
                      <span className="ml-star">
                        <i className="ml-dot" aria-hidden />
                        {it.starTitle}
                      </span>
                    )}
                    <span className="ml-date">
                      {it.type === "moment" && TYPE_LABEL[it.mtype] ? `${TYPE_LABEL[it.mtype]} · ` : ""}
                      {d}
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
          top: var(--ml-top, calc(var(--header-top) + 100px)); /* below the filters (and search, when open) */
          transition: top var(--motion-paper) var(--ease-sisi);
          color: var(--sisi-ink);
        }
        .ml-scroll {
          position: absolute; inset: 0; overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch;
          /* the last row scrolls fully clear of the fixed tabs */
          padding: 22px var(--stage-padding) calc(var(--nav-total) + 36px);
          scrollbar-width: none;
          touch-action: pan-y;
        }
        .ml-empty { margin: 28px 4px; font-family: var(--font-editorial); font-style: italic; font-size: var(--text-body); color: var(--ink-60); }
        .ml-group { margin-top: 24px; }
        .ml-month { margin: 0 0 4px; }
        .ml-row {
          display: flex; gap: 14px; align-items: flex-start; width: 100%; min-height: 44px; padding: 12px 0; border: 0;
          border-bottom: 1px solid var(--ink-08); background: transparent; text-align: left; cursor: pointer; color: inherit;
        }
        .ml-group .ml-row:last-child { border-bottom: 0; }
        .ml-thumb { flex: 0 0 76px; width: 76px; height: 54px; object-fit: cover; border-radius: 2px; display: block; }
        .ml-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
        .ml-date { font-family: var(--font-ui); font-size: var(--text-meta); line-height: var(--leading-meta); color: var(--ink-60); letter-spacing: 0.005em; }
        .ml-star { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-editorial); font-weight: 500; font-size: 13px; color: var(--ink-80); }
        .ml-dot { flex: none; display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--sisi-gold); }
        /* Moment content is never truncated */
        .ml-text { font-family: var(--font-editorial); font-size: var(--text-body); line-height: var(--leading-body); overflow-wrap: break-word; white-space: pre-wrap; }
        .ml-text em { font-style: italic; color: var(--ink-60); }
      `}</style>
    </section>
  );
}
