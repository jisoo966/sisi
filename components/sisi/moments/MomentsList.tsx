"use client";

import { useMemo } from "react";
import { IconBubble, IconEye, IconLeaf, IconMoon, IconPaws, IconPencil, StarGlyph } from "@/components/ds";
import { isRealPhoto, monthLabel } from "@/lib/moments";
import { TYPE_LABEL } from "@/lib/momentStore";
import type { Placed } from "@/lib/momentsTimeline";

/**
 * MomentsList — browsing memories by date.
 * Warm ivory torn paper over the world; grouped by month, then by day
 * (Today · Yesterday · Wednesday, Oct 1); each row shows its time; typographic rows,
 * with a small thumbnail only when the Moment holds a real photo; a tiny
 * gold dot marks a Star-linked Moment. The search field lives in the
 * Moments header (it opens only when asked for); `query` filters here by
 * Moment text, the connected Star, the date / month and the reflection type.
 * Picking a row returns to the Memory Trail and walks to that Moment.
 */

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

/** Today · Oct 2 · Yesterday · Oct 1 · Wednesday, Sep 30 (the month above holds the year). */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const short = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (d.toDateString() === now.toDateString()) return `Today · ${short}`;
  if (d.toDateString() === y.toDateString()) return `Yesterday · ${short}`;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function MomentsList({
  placed,
  onPick,
  query = "",
  hideStar = false,
}: {
  placed: Placed[];
  /** a row was tapped (with the row, so the detail can open from it) */
  onPick: (index: number, el: Element) => void;
  query?: string;
  /** showing one Star's history: its name is already the chip above */
  hideStar?: boolean;
}) {
  const q = query;
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out: { label: string; days: { label: string; rows: Placed[] }[] }[] = [];
    placed.forEach((p) => {
      const it = p.item;
      if (needle && !haystack(p).toLowerCase().includes(needle)) return;
      const m = monthLabel(it.at);
      const day = dayLabel(it.at);
      let g = out[out.length - 1];
      if (!g || g.label !== m) out.push((g = { label: m, days: [] }));
      const dg = g.days[g.days.length - 1];
      if (dg && dg.label === day) dg.rows.push(p);
      else g.days.push({ label: day, rows: [p] });
    });
    return out;
  }, [placed, q]);

  return (
    <section className="ml-sheet ds-paper ds-paper--memory" aria-label="Moments list">
      <div className="ml-scroll ds-scroll">
        {groups.length === 0 && <p className="ml-empty">{q.trim() ? "Nothing here with those words yet." : "Your Moments will gather here as you walk."}</p>}

        {groups.map((g) => (
          <div key={g.label} className="ml-group">
            <h2 className="ml-month t-card-title">{g.label}</h2>
            {g.days.map((dg) => (
            <div key={dg.label} className="ml-day">
            <h3 className="ml-day-label">{dg.label}</h3>
            {dg.rows.map((p) => {
              const it = p.item;
              // the month and the day are headings; the row keeps only its time
              const time = new Date(it.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              const kind = it.type === "moment" ? TYPE_LABEL[it.mtype] : undefined;
              return (
                <button key={p.key} type="button" className="ml-row" onClick={(e) => onPick(p.index, e.currentTarget)}>
                  {/* every row starts on the same square: the photo, or the kind of
                      Moment as a crayon mark — one line for the eye to follow */}
                  {it.type === "moment" && isRealPhoto(it.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="ml-thumb" src={it.image} alt="" loading="lazy" />
                  ) : (
                    <span className="ml-mark" aria-hidden>
                      {it.type === "rest" ? (
                        <IconMoon />
                      ) : it.mtype === "visualization" ? (
                        <IconEye />
                      ) : it.mtype === "something_good" ? (
                        <IconLeaf />
                      ) : it.mtype === "small_step" ? (
                        <IconPaws />
                      ) : it.mtype === "companion_note" ? (
                        <IconBubble />
                      ) : (
                        <IconPencil />
                      )}
                    </span>
                  )}
                  {/* every row reads the same way: what was kept · when (and what kind)
                      · the Star it belongs to */}
                  <span className="ml-body">
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
                    {kind && <span className="ml-date">{kind}</span>}
                    {it.type === "moment" && it.starTitle && !hideStar && (
                      <span className="ml-star">
                        <StarGlyph size={12} />
                        {it.starTitle}
                      </span>
                    )}
                  </span>
                  <span className="ml-time">{time}</span>
                </button>
              );
            })}
            </div>
            ))}
          </div>
        ))}
      </div>

      <style jsx global>{`
        .ml-sheet {
          position: absolute; z-index: 20; left: 0; right: 0; bottom: 0;
          top: var(--ml-top, calc(var(--header-top) + 100px)); /* below the filters (and search, when open) */
          transition: top var(--motion-paper) var(--ease-sisi);
          color: var(--sisi-ink);
          /* the shared soft paper edge along the top, with rounded top corners */
          -webkit-mask: var(--deckle-mask-sheet);
          mask: var(--deckle-mask-sheet);
          border-radius: 18px 18px 0 0;
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
        .ml-day { margin-top: 14px; }
        .ml-day-label {
          margin: 0; padding: 4px 0 2px;
          font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; letter-spacing: 0.02em; color: var(--ink-60);
        }
        .ml-row {
          position: relative; display: flex; gap: 14px; align-items: center; width: 100%; min-height: 72px; padding: 14px 0; border: 0;
          background: none; text-align: left; cursor: pointer; color: inherit;
        }
        /* a light hand-drawn line between Moments, starting where the words do */
        .ml-row::after {
          content: ""; position: absolute; left: 66px; right: 0; bottom: 0; height: 5px; opacity: 0.28; pointer-events: none;
          background: url("/assets/ui/sketch-line-thin-ink.svg") 0 0 / 100% 100% no-repeat;
        }
        .ml-row:active { opacity: 0.7; }
        .ml-day .ml-row:last-child::after { display: none; }
        /* the same square at the start of every row */
        .ml-thumb, .ml-mark { flex: 0 0 52px; width: 52px; height: 52px; border-radius: 12px; display: block; }
        .ml-thumb { object-fit: cover; }
        .ml-mark { display: inline-flex; align-items: center; justify-content: center; background: var(--ink-08); color: var(--ink-80); }
        .ml-mark svg { width: 24px; height: 24px; }
        /* the time sits level with the words, at the row's end */
        .ml-time { flex: none; align-self: flex-start; margin-top: 3px; font-family: var(--font-ui); font-size: var(--text-meta); color: var(--ink-60); font-variant-numeric: tabular-nums; }
        .ml-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
        .ml-date { font-family: var(--font-ui); font-size: var(--text-meta); line-height: var(--leading-meta); color: var(--ink-60); letter-spacing: 0.005em; }
        .ml-star { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-editorial); font-style: italic; font-size: 13px; color: var(--ink-60); }
        .ml-dot { flex: none; display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--sisi-gold); }
        /* Moment content is never truncated */
        .ml-text {
          font-family: var(--font-editorial); font-size: 16px; line-height: 1.3; color: var(--sisi-ink); overflow-wrap: break-word;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .ml-text em { font-style: italic; color: var(--ink-60); }
      `}</style>
    </section>
  );
}
