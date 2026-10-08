"use client";

import { useEffect, useState } from "react";
import type { Star } from "@/lib/myStars";
import { loadStars, walkingStars } from "@/lib/myStars";
import { createMoment } from "@/lib/momentStore";
import { markHint } from "@/lib/hints";
import { WritingPage, type WritingPhoto } from "@/components/sisi/WritingPage";
import { FilterChip } from "@/components/ds";
import type { EntryKind } from "@/lib/myStars";
import { PaperToast } from "@/components/sisi/journey-v2/PaperToast";

/**
 * MomentCapture — Journey Capture: keep something from the life you are
 * walking through (a few words, a photo, or both), on the writing page:
 * the question is the page, the photo and Save ride on the keyboard, and the
 * wish it belongs to (optional — life needn't be a wish) sits at the top.
 *
 * Saved as one Moment: source journey_capture · type general.
 */
export function MomentCapture({
  open,
  onClose,
}: {
  open: boolean;
  /** @deprecated captures are no longer linked to the Current Star automatically */
  star?: Star | null;
  onClose: () => void;
}) {
  const [photo, setPhoto] = useState<WritingPhoto | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [stars, setStars] = useState<Star[]>([]);
  const [wish, setWish] = useState<Star | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** optional: a sign, or a small step (else simply a moment) */
  const [kind, setKind] = useState<EntryKind | null>(null);

  // put away (✕ or a tap outside) keeps what was written; saving clears it
  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setError("");
    loadStars().then((s) => setStars(walkingStars(s)));
  }, [open]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const close = () => {
    markHint("capture");
    onClose();
  };

  const onPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setPhoto(await compress(reader.result as string, 1200, 0.85));
        setError("");
      } catch {
        setError("That photo couldn’t be opened. Try another?");
      }
    };
    reader.readAsDataURL(file);
  };

  const canSave = !!photo || text.trim().length > 0;
  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    try {
      await createMoment({
        source: "journey_capture",
        type: kind ?? "general",
        text: text.trim() || null,
        image: photo?.dataURL ?? null,
        imageWidth: photo?.width,
        imageHeight: photo?.height,
        starId: wish?.id ?? null, // only if the person chose one
      });
      markHint("capture");
      markHint("moments"); // their first Moment — Moments needn't explain itself now
      setPhoto(null);
      setText("");
      setWish(null);
      setKind(null);
      onClose();
      setToast(wish ? `Kept. It’s part of “${wish.wish}” now.` : "Kept. It’s in your Moments.");
    } catch {
      setError("It didn’t save just now. Try once more?");
    }
    setSaving(false);
  };

  return (
    <>
      <WritingPage
        open={open}
        onClose={close}
        label="Capture a moment"
        question="What would you like to keep from today?"
        text={text}
        onText={setText}
        photo={photo}
        onPhoto={onPhoto}
        onRemovePhoto={() => setPhoto(null)}
        wish={wish}
        wishes={stars}
        onWish={setWish}
        extra={
          // the same writing everywhere: what kind of moment, if you like
          <div className="ds-chip-row" role="group" aria-label="What kind of moment (optional)" onMouseDown={(e) => e.preventDefault()}>
            {(
              [
                ["something_good", "A sign"],
                ["small_step", "A small step"],
              ] as const
            ).map(([k, label]) => (
              <FilterChip key={k} selected={kind === k} onClick={() => setKind((c) => (c === k ? null : k))}>
                {label}
              </FilterChip>
            ))}
          </div>
        }
        saving={saving}
        canSave={canSave}
        onSave={save}
        error={error}
      />
      <PaperToast message={toast} />
    </>
  );
}

function compress(dataURL: string, maxDim: number, quality: number): Promise<WritingPhoto> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const s = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * s);
      const h = Math.round(img.height * s);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataURL: c.toDataURL("image/jpeg", quality), width: w, height: h });
    };
    img.onerror = () => reject(new Error("load failed"));
    img.src = dataURL;
  });
}
