"use client";

import { useEffect, useState } from "react";
import { FilterChip } from "@/components/ds";
import { WritingPage } from "@/components/sisi/WritingPage";
import { PaperToast } from "@/components/sisi/journey-v2/PaperToast";
import { haptic } from "@/lib/haptics";
import { addSign, type EntryKind, type Sign, type Star } from "@/lib/myStars";
import { awardStarlight } from "@/lib/starlight";

/**
 * WalkNote — "Leave a small note" while walking with a wish: written right
 * here in the Journey (never a trip up to the Stars). The same writing page
 * as everywhere; the wish is the one being carried; a sign or a small step,
 * kept exactly like Reflect on today (its Star's journal + Moments + Starlight).
 */

const KIND: Record<EntryKind, { chip: string; ph: string }> = {
  something_good: { chip: "A sign", ph: "What showed up for this wish today?" },
  small_step: { chip: "A small step", ph: "What small step did you take?" },
};

export function WalkNote({
  open,
  star,
  onClose,
  onSaved,
  question,
  plain = false,
}: {
  open: boolean;
  star: Star;
  onClose: () => void;
  onSaved?: (s: Sign) => void;
  /** her question (else: what happened along the way, or the kind's own) */
  question?: string;
  /** only the words (no kinds, no toast: the caller shows where it went) */
  plain?: boolean;
}) {
  // the kind is optional: a moment is enough; a sign or a small step if you like
  const [kind, setKind] = useState<EntryKind | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // put away keeps the words; saving clears them
  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);
  }, [open]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const save = async () => {
    const t = text.trim();
    if (!t || saving) return;
    setSaving(true);
    setError("");
    try {
      const sign = await addSign(star.id, t, "manual", kind ?? undefined);
      awardStarlight({ source: kind === "small_step" ? "small_step_saved" : "something_good_saved", sourceId: sign.id, starId: star.id });
      onSaved?.(sign);
      setText("");
      onClose();
      if (!plain) setToast(`Kept. It’s part of “${star.wish}” now.`);
    } catch {
      haptic("error");
      setError("It didn’t save just now. Try once more?");
    }
    setSaving(false);
  };

  return (
    <>
      <WritingPage
        open={open}
        onClose={onClose}
        label="Leave a small note"
        question={question ?? (kind ? KIND[kind].ph : "What happened along the way?")}
        text={text}
        onText={setText}
        wish={star}
        extra={
          plain ? undefined : (
          // optional, and tapping again lets it go (choosing keeps the keyboard up)
          <div className="ds-chip-row" role="group" aria-label="What kind of moment (optional)" onMouseDown={(e) => e.preventDefault()}>
            {(Object.keys(KIND) as EntryKind[]).map((k) => (
              <FilterChip key={k} selected={kind === k} onClick={() => setKind((c) => (c === k ? null : k))}>
                {KIND[k].chip}
              </FilterChip>
            ))}
          </div>
          )
        }
        saving={saving}
        canSave={!!text.trim()}
        onSave={save}
        error={error}
      />
      <PaperToast message={toast} />
    </>
  );
}
