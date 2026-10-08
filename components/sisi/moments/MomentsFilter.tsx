"use client";

import { useEffect, useState } from "react";
import { FilterChip, FocusPaper, PrimaryButton, StarGlyph, TextAction } from "@/components/ds";
import { isRealPhoto, type MomentItem } from "@/lib/moments";
import type { Star } from "@/lib/myStars";

/**
 * Finding Moments — opened from the filter icon, never shown by default.
 *
 * Two separate questions, one answer each:
 *   Wish   which wish a Moment belongs to
 *   Kind   what sort of Moment it is (a note, a photo, pictured, a small step,
 *          something good)
 * While a filter is on, one chip per choice ("✦ love ×") says what is being
 * shown; its × returns to everything.
 */

export type MomentKind = "notes" | "photos" | "pictured" | "steps" | "good";

export const KINDS: { key: MomentKind; label: string }[] = [
  { key: "notes", label: "Notes" },
  { key: "photos", label: "Photos" },
  { key: "pictured", label: "Pictured" },
  { key: "steps", label: "Small steps" },
  { key: "good", label: "Signs" },
];

export function kindOf(m: MomentItem): MomentKind {
  if (isRealPhoto(m.image)) return "photos";
  if (m.mtype === "visualization") return "pictured";
  if (m.mtype === "small_step") return "steps";
  if (m.mtype === "something_good") return "good";
  return "notes";
}

export type MomentsFilterValue = { wish: string | null; kind: MomentKind | null };

export function MomentsFilter({
  open,
  value,
  stars,
  count,
  onApply,
  onClose,
}: {
  open: boolean;
  value: MomentsFilterValue;
  /** the wishes that have Moments */
  stars: Star[];
  /** how many Moments a choice would show */
  count: (v: MomentsFilterValue) => number;
  onApply: (v: MomentsFilterValue) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MomentsFilterValue>(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const n = count(draft);
  const any = draft.wish !== null || draft.kind !== null;

  return (
    <FocusPaper
      open={open}
      onClose={onClose}
      title="Find moments"
      titleId="mf-title"
      className="mf-focus"
      headerExtra={
        any ? (
          <TextAction className="mf-clear" onClick={() => setDraft({ wish: null, kind: null })}>
            Clear
          </TextAction>
        ) : undefined
      }
      footer={
        <PrimaryButton block disabled={n === 0} onClick={() => onApply(draft)}>
          {n === 0 ? "Nothing here yet" : `Show ${n} ${n === 1 ? "moment" : "moments"}`}
        </PrimaryButton>
      }
    >
      {stars.length > 0 && (
        <>
          <p className="ds-kicker">Wish</p>
          <div className="mf-chips" role="radiogroup" aria-label="Wish">
            {stars.map((s) => (
              <FilterChip
                key={s.id}
                selected={draft.wish === s.id}
                onClick={() => setDraft((d) => ({ ...d, wish: d.wish === s.id ? null : s.id }))}
                className="mf-wish"
              >
                <StarGlyph size={12} />
                <span className="mf-wish-label">{s.wish}</span>
              </FilterChip>
            ))}
          </div>
        </>
      )}
      <p className="ds-kicker">Kind</p>
      <div className="mf-chips" role="radiogroup" aria-label="Kind">
        {KINDS.map((k) => (
          <FilterChip key={k.key} selected={draft.kind === k.key} onClick={() => setDraft((d) => ({ ...d, kind: d.kind === k.key ? null : k.key }))}>
            {k.label}
          </FilterChip>
        ))}
      </div>
      <style jsx global>{`
        .mf-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 var(--space-5); }
        .mf-wish { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; }
        .mf-wish-label { min-width: 0; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mf-clear { color: var(--ink-60) !important; font-family: var(--font-ui) !important; font-size: 14px !important; }
      `}</style>
    </FocusPaper>
  );
}
