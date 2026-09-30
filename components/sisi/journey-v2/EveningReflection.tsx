"use client";

import { useEffect, useState } from "react";
import type { Star } from "@/lib/myStars";
import { addSign } from "@/lib/myStars";
import { awardStarlight, starlightMessage } from "@/lib/starlight";
import { FocusPaper, PrimaryButton, TextAction } from "@/components/ds";

/**
 * EveningReflection — at night SiSi pauses beneath the Current Star and asks
 * one short thing: "What felt good today?"
 *
 * Offered at most once per evening (after 7pm), only when nothing else is
 * open, and never required: "Not tonight" closes it until tomorrow.
 * The sentence is saved to the Current Star's timeline; one Little Light.
 */

const KEY = "sisi:evening-offered";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** Should the evening reflection be offered right now? */
export function eveningDue(): boolean {
  if (typeof window === "undefined") return false;
  const h = new Date().getHours();
  if (h < 19 && h >= 4) return false;
  try {
    return localStorage.getItem(KEY) !== todayKey();
  } catch {
    return false;
  }
}
function markOffered() {
  try {
    localStorage.setItem(KEY, todayKey());
  } catch {
    // ignore
  }
}

export function EveningReflection({
  open,
  star,
  onClose,
}: {
  open: boolean;
  star: Star | null;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [done, setDone] = useState<null | string>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      markOffered();
      setText("");
      setDone(null);
      setSaving(false);
    }
  }, [open]);

  const leave = async () => {
    const note = text.trim();
    if (!note || saving) return;
    setSaving(true);
    let msg: string | null = null;
    if (star) {
      try {
        const sign = await addSign(star.id, note);
        // "What felt good today?" is Something good, saved to the Star
        msg = starlightMessage(await awardStarlight({ source: "something_good_saved", sourceId: sign.id, starId: star.id }));
      } catch {
        // ignore — keep the evening gentle
      }
    }
    setDone(msg ?? "");
    setTimeout(onClose, 2200);
  };

  return (
    <FocusPaper open={open} onClose={onClose} title="Evening reflection" titleId="ev-title" className="ev-focus">
      <div className="ev-body">
        {done === null ? (
          <>
            <p className="t-card-title ev-title">What felt good today?</p>
            <textarea
              className="ds-field ev-input"
              rows={2}
              maxLength={200}
              placeholder="One sentence is enough."
              aria-label="What felt good today?"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="ds-actions">
              <PrimaryButton block loading={saving} disabled={!text.trim()} onClick={leave}>
                Leave a little light
              </PrimaryButton>
              <TextAction onClick={onClose}>Not tonight</TextAction>
            </div>
          </>
        ) : (
          <>
            <p className="t-card-title ev-title">Kept with your Star.</p>
            {done && <p className="t-body" style={{ margin: 0, color: "var(--ink-80)" }}>{done}</p>}
          </>
        )}
      </div>
      <style jsx global>{`
        .ev-body { text-align: center; }
        .ev-title { margin: 4px 0 16px; }
        .ev-input { text-align: left; }
        .ev-plus { display: flex; align-items: center; justify-content: center; gap: 8px; font-family: var(--font-editorial); font-weight: 500; font-size: var(--text-screen-title); margin: 0 0 8px; }
        .ev-plus img { width: 28px; height: 28px; }
      `}</style>
    </FocusPaper>
  );
}
