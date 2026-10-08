"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { FilterChip, IconBack, IconBubble, IconButton, IconEye, IconPaws, IconPencil } from "@/components/ds";
import { SisiChatCharacter } from "@/components/sisi/journey-v2/SisiChatCharacter";
import { isRealPhoto } from "@/lib/moments";
import type { Sign, Star } from "@/lib/myStars";
import type { StarMarks } from "@/lib/starCare";

/**
 * StarJournal — the way walked with one wish (Stars, not Moments).
 *
 * Moments is the archive of a whole life; this is one wish's journal:
 * Sísí sits on the paper and says how far you have come, then what you did,
 * by activity. "All" keeps everything; "Walked" shows the days walked with
 * Sísí as paw prints on a calendar (no streaks, no empty days to feel bad about).
 *
 * One mark per activity, everywhere: Picture it = eye, Walk with it = paws,
 * Reflect on today = pencil (a sign · a small step); a note from Sísí = bubble.
 */

export type JournalKind = "all" | "pictured" | "walked" | "reflected";

const FILTERS: { id: JournalKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pictured", label: "Pictured" },
  { id: "walked", label: "Walked" },
  { id: "reflected", label: "Moments" },
];

/** which activity a record came from */
const activityOf = (s: Sign): JournalKind => (s.momentType === "visualization" ? "pictured" : "reflected");

const KIND_LABEL: Record<string, string> = {
  small_step: "A small step",
  something_good: "A sign",
  visualization: "Pictured it",
  companion_note: "A note",
  general: "A moment",
};

type Row = { key: string; at: string; together?: true; pictured?: true; sign?: Sign };

export function StarJournal({
  open,
  star,
  signs,
  days,
  pictures = [],
  marks,
  kind,
  onKind,
  onClose,
}: {
  open: boolean;
  star: Star;
  /** this Star's Moments, newest first */
  signs: Sign[];
  /** the days walked together (YYYY-MM-DD), newest first */
  days: string[];
  /** when Picture it was lived through (ISO) — shown even when nothing was written */
  pictures?: string[];
  marks: StarMarks;
  kind: JournalKind;
  onKind: (k: JournalKind) => void;
  onClose: () => void;
}) {
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (kind !== "walked") {
      for (const s of signs) {
        if (kind !== "all" && activityOf(s) !== kind) continue;
        out.push({ key: s.id, at: s.createdAt, sign: s });
      }
    }
    // a Picture it with no words after: still a record of the time given
    if (kind === "all" || kind === "pictured") {
      const written = signs.filter((s) => s.momentType === "visualization").map((s) => new Date(s.createdAt).getTime());
      for (const at of pictures) {
        const t = new Date(at).getTime();
        if (written.some((w) => Math.abs(w - t) < 30 * 60 * 1000)) continue;
        out.push({ key: `pic-${at}`, at, pictured: true });
      }
    }
    // a day together is a quiet row of its own in "All" (noon: it sorts within its day)
    if (kind === "all") for (const d of days) out.push({ key: `day-${d}`, at: `${d}T12:00:00`, together: true });
    return out.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [signs, days, pictures, kind]);

  const months = useMemo(() => {
    const groups: { label: string; rows: Row[] }[] = [];
    for (const r of rows) {
      const label = monthOf(r.at);
      const g = groups[groups.length - 1];
      if (g && g.label === label) g.rows.push(r);
      else groups.push({ label, rows: [r] });
    }
    return groups;
  }, [rows]);

  if (typeof document === "undefined") return null;
  const root = document.getElementById("sisi-overlay-root") ?? document.body;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="journal"
          className="sj-root"
          role="dialog"
          aria-label={`Your way with ${star.wish}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.1 } }}
          transition={{ duration: 0.3 }}
        >
          {/* tap the night above the paper: back to the Star */}
          <button type="button" className="sj-away" aria-label="Back to my Star" tabIndex={-1} onClick={onClose} />
          <header className="sj-head">
            <IconButton surface="dark" label="Back to my Star" onClick={onClose}>
              <IconBack />
            </IconButton>
          </header>
          <div className="sj-title">
            <h2 className="sj-wish">{star.wish || "Your Star"}</h2>
            <p className="sj-since">Since {shortDate(star.createdAt)}</p>
          </div>

          <motion.section
            className="sj-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.32, ease: [0.55, 0, 0.75, 0.2] } }}
            transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Sísí is the one speaking here: she sits on the paper */}
            <div className="sj-sisi" aria-hidden>
              <SisiChatCharacter expression="listening" />
            </div>
            <div className="sj-paper">
              <div className="sj-scroll">
                <p className="sj-say">{sisiSays(kind, marks, signs.length)}</p>
                <div className="ds-chip-row sj-filters" role="group" aria-label="Show">
                  {FILTERS.map((f) => (
                    <FilterChip key={f.id} selected={kind === f.id} onClick={() => onKind(f.id)}>
                      {f.label}
                    </FilterChip>
                  ))}
                </div>

                {kind === "walked" ? (
                  <Walked days={days} />
                ) : rows.length === 0 ? (
                  <p className="sj-empty">{emptyLine(kind)}</p>
                ) : (
                  months.map((g) => (
                    <div key={g.label} className="sj-month">
                      <h3 className="sj-month-label t-card-title">{g.label}</h3>
                      {g.rows.map((r) => (
                        <JournalRow key={r.key} row={r} />
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.section>

          <style jsx global>{`
            .sj-root {
              position: fixed; inset: 0; z-index: var(--z-modal); color: var(--sisi-paper);
              /* the overlay root sits outside the screen's own tokens: the same header line, here */
              --header-top: max(calc(var(--safe-top, 0px) + 12px), 44px);
              /* the night stays: the Star screen steps back behind it */
              background: linear-gradient(rgba(4, 12, 24, 0.55), rgba(4, 12, 24, 0.2) 40%, rgba(4, 12, 24, 0));
            }
            .sj-away { position: absolute; inset: 0; border: 0; padding: 0; background: none; cursor: default; -webkit-tap-highlight-color: transparent; }
            .sj-title { pointer-events: none; }
            .sj-head > * { pointer-events: auto; }
            .sj-head { z-index: 1; pointer-events: none; position: absolute; top: 0; left: 0; right: 0; padding: var(--header-top) max(8px, var(--safe-right)) 0 max(8px, var(--safe-left)); }
            .sj-title { position: absolute; left: var(--space-6); right: var(--space-6); top: calc(var(--header-top) + 40px); text-align: center; }
            .sj-wish {
              margin: 0; font-family: var(--font-editorial); font-weight: 300; font-size: var(--text-card-title); line-height: var(--leading-title);
              letter-spacing: -0.01em; color: var(--sisi-paper); text-wrap: balance;
              display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
            }
            .sj-since { margin: 6px 0 0; font-family: var(--font-ui); font-size: var(--text-meta); letter-spacing: 0.02em; color: var(--paper-60); }
            .sj-sheet { position: absolute; left: 0; right: 0; bottom: 0; top: calc(var(--header-top) + 150px); filter: drop-shadow(0 -6px 18px rgba(0, 0, 0, 0.35)); }
            /* the Moments paper: memory grain, a torn top edge */
            .sj-paper {
              position: absolute; inset: 0; color: var(--sisi-ink);
              background: var(--sisi-paper) var(--grain-memory) 0 0 / var(--grain-size); background-blend-mode: multiply;
              -webkit-mask: var(--deckle-mask-sheet); mask: var(--deckle-mask-sheet); border-radius: 18px 18px 0 0;
            }
            .sj-sisi { position: absolute; top: 0; right: 76px; width: 0; height: 0; z-index: 2; transform: scale(0.6); transform-origin: 0 0; pointer-events: none; }
            .sj-scroll {
              position: absolute; inset: 0; overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch;
              padding: var(--space-6) var(--stage-padding, 24px) calc(var(--safe-bottom) + 40px); scrollbar-width: none;
            }
            .sj-scroll::-webkit-scrollbar { display: none; }
            /* Sísí's words stand upright, as everywhere she speaks; room on the right for her */
            .sj-say {
              margin: 0 104px 0 0; font-family: var(--font-editorial); font-size: 19px; line-height: 1.4;
              letter-spacing: var(--tracking-editorial); color: var(--sisi-ink); text-wrap: balance;
            }
            .sj-filters { margin: var(--space-5) 0 var(--space-2); flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
            .sj-filters::-webkit-scrollbar { display: none; }
            .sj-filters .ds-chip { flex: none; }
            .sj-empty { margin: var(--space-6) 0; font-family: var(--font-editorial); font-style: italic; font-size: var(--text-body); color: var(--ink-60); }
            .sj-month { margin-top: var(--space-5); }
            .sj-month-label { margin: 0 0 2px; }
            /* the Moments list row: one square, the words, the date */
            .sj-row { position: relative; display: flex; gap: 14px; align-items: center; min-height: 72px; padding: 14px 0; }
            .sj-row::after {
              content: ""; position: absolute; left: 66px; right: 0; bottom: 0; height: 5px; opacity: 0.28; pointer-events: none;
              background: url("/assets/ui/sketch-line-thin-ink.svg") 0 0 / 100% 100% no-repeat;
            }
            .sj-month .sj-row:last-child::after { display: none; }
            .sj-thumb, .sj-mark { flex: 0 0 52px; width: 52px; height: 52px; border-radius: 12px; display: block; }
            .sj-thumb { object-fit: cover; }
            .sj-mark { display: inline-flex; align-items: center; justify-content: center; background: var(--ink-08); color: var(--ink-80); }
            .sj-mark svg { width: 24px; height: 24px; }
            .sj-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
            .sj-kind { font-family: var(--font-ui); font-size: var(--text-meta); letter-spacing: 0.02em; color: var(--ink-60); }
            .sj-text {
              font-family: var(--font-editorial); font-size: 16px; line-height: 1.3; color: var(--sisi-ink); overflow-wrap: break-word;
              display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
            }
            /* what was pictured, and the days together: quoted, quiet */
            .sj-text.is-pictured { font-style: italic; }
            .sj-text.is-day { font-style: italic; color: var(--ink-60); }
            .sj-date { flex: none; align-self: flex-start; margin-top: 3px; font-family: var(--font-ui); font-size: var(--text-meta); color: var(--ink-60); font-variant-numeric: tabular-nums; }
            /* Walked: paw prints on the days you walked with Sísí */
            .sj-cal-month { margin-top: var(--space-5); }
            .sj-cal-head { display: flex; justify-content: space-between; align-items: baseline; }
            .sj-cal-count { font-family: var(--font-ui); font-size: var(--text-meta); color: var(--ink-60); }
            .sj-cal { display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 6px; margin-top: var(--space-3); text-align: center; }
            .sj-cal-wd { font-family: var(--font-ui); font-size: 11px; color: var(--ink-60); padding-bottom: 4px; }
            .sj-cal-day {
              position: relative; height: 40px; width: 40px; margin: 0 auto; border-radius: 50%;
              display: inline-flex; align-items: center; justify-content: center;
              font-family: var(--font-ui); font-size: 13px; color: var(--ink-60); font-variant-numeric: tabular-nums;
            }
            .sj-cal-day.is-together { color: var(--ink-80); }
            .sj-cal-day.is-together svg { width: 24px; height: 24px; }
            .sj-cal-day.is-today { box-shadow: inset 0 0 0 1.5px var(--sisi-ink); color: var(--sisi-ink); }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    root,
  );
}

function JournalRow({ row }: { row: Row }) {
  const date = shortDate(row.at);
  if (row.pictured) {
    return (
      <div className="sj-row">
        <span className="sj-mark" aria-hidden>
          <IconEye />
        </span>
        <span className="sj-body">
          <span className="sj-text is-day">Pictured it with Sísí</span>
        </span>
        <span className="sj-date">{date}</span>
      </div>
    );
  }
  if (row.together) {
    return (
      <div className="sj-row">
        <span className="sj-mark" aria-hidden>
          <IconPaws />
        </span>
        <span className="sj-body">
          <span className="sj-text is-day">Walked with Sísí</span>
        </span>
        <span className="sj-date">{date}</span>
      </div>
    );
  }
  const s = row.sign!;
  const type = s.kind ?? s.momentType ?? "general";
  return (
    <div className="sj-row">
      {isRealPhoto(s.image) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sj-thumb" src={s.image} alt="" loading="lazy" />
      ) : (
        <span className="sj-mark" aria-hidden>
          {type === "visualization" ? <IconEye /> : type === "companion_note" ? <IconBubble /> : <IconPencil />}
        </span>
      )}
      <span className="sj-body">
        <span className="sj-kind">{KIND_LABEL[type] ?? KIND_LABEL.general}</span>
        <span className={`sj-text${type === "visualization" ? " is-pictured" : ""}`}>{s.text}</span>
      </span>
      <span className="sj-date">{date}</span>
    </div>
  );
}

/** Each month with a day walked (and this month), paw prints on those days. */
function Walked({ days }: { days: string[] }) {
  const set = new Set(days);
  const today = localKey(new Date());
  const monthKeys = Array.from(new Set([today.slice(0, 7), ...days.map((d) => d.slice(0, 7))])).sort().reverse();
  if (days.length === 0) return <p className="sj-empty">{emptyLine("walked")}</p>;
  return (
    <>
      {monthKeys.map((mk) => {
        const [y, m] = mk.split("-").map(Number);
        const first = new Date(y, m - 1, 1);
        const count = new Date(y, m, 0).getDate();
        const n = days.filter((d) => d.startsWith(mk)).length;
        const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
        return (
          <div key={mk} className="sj-cal-month">
            <div className="sj-cal-head">
              <h3 className="sj-month-label t-card-title">{first.toLocaleDateString("en-US", { month: "long" })}</h3>
              {n > 0 && <span className="sj-cal-count">{n === 1 ? "1 day walked" : `${n} days walked`}</span>}
            </div>
            <div className="sj-cal">
              {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
                <span key={i} className="sj-cal-wd" aria-hidden>
                  {w}
                </span>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <span key={`e${i}`} />;
                const key = `${mk}-${String(d).padStart(2, "0")}`;
                const together = set.has(key);
                return (
                  <span
                    key={key}
                    className={`sj-cal-day${together ? " is-together" : ""}${key === today ? " is-today" : ""}`}
                    aria-label={together ? `${d}, walked with Sísí` : undefined}
                  >
                    {together ? <IconPaws /> : d}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** What Sísí says on top: what this view shows, in her words. */
function sisiSays(kind: JournalKind, marks: StarMarks, total: number): string {
  if (kind === "walked") return marks.walked > 0 ? "You keep making space for this wish." : "Walk with this wish, and I’ll keep the days for you.";
  if (kind === "pictured") return marks.pictured > 0 ? "You keep seeing it as yours. That is how it begins to feel real." : "Picture it, and I’ll keep what you see here.";
  if (kind === "reflected") return marks.reflected > 0 ? "Look, it’s already finding its way to you." : "When you notice a sign or take a small step, keep it here.";
  const done = total + marks.walked;
  return done >= 6 ? "Look how much you’ve done for this wish." : done > 0 ? "You’ve already begun. Every step stays here." : "Your journey with this wish begins here.";
}

function emptyLine(kind: JournalKind): string {
  if (kind === "walked") return "The days you walk with this wish will gather here.";
  if (kind === "pictured") return "What you picture for this wish will gather here.";
  if (kind === "reflected") return "The moments you keep for this wish will gather here.";
  return "Everything you do for this wish will gather here.";
}

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthOf(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", sameYear ? { month: "long" } : { month: "long", year: "numeric" });
}
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (localKey(d) === localKey(new Date())) return "Today";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
