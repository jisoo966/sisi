"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { loadStars, walkingStars } from "@/lib/myStars";
import { createMoment, updateMoment } from "@/lib/momentStore";
import { hintDone, markHint } from "@/lib/hints";
import { FocusPaper, StarGlyph } from "@/components/ds";

/**
 * MomentCapture — Journey Capture: keep something from the life you are
 * walking through (a photo, a few words, or both).
 *
 *   options   Capture a moment — Take a photo (or choose from library) ·
 *             Write a note. The first time, one line explains what it's for.
 *   capture   the photo + optional words, or a short note → Save moment
 *   saved     "Kept." — it is in Moments now. Optionally, and only if the
 *             user wants: Connect to a Star (the SAME record gets a star_id;
 *             nothing is copied). Never automatic: life needn't be a wish.
 *
 * Saved as one Moment: source journey_capture · type general.
 */

type Step = "options" | "capture" | "saved" | "connect";

export function MomentCapture({
  open,
  onClose,
}: {
  open: boolean;
  /** @deprecated captures are no longer linked to the Current Star automatically */
  star?: Star | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("options");
  const [photo, setPhoto] = useState<{ dataURL: string; width: number; height: number } | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [connectedTo, setConnectedTo] = useState<Star | null>(null);
  const [firstTime, setFirstTime] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("options");
    setPhoto(null);
    setText("");
    setSaving(false);
    setError("");
    setSavedId(null);
    setConnectedTo(null);
    setFirstTime(!hintDone("capture"));
    loadStars().then((s) => setStars(walkingStars(s)));
  }, [open]);

  const close = () => {
    markHint("capture");
    onClose();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setPhoto(await compress(reader.result as string, 1200, 0.85));
        setStep("capture");
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
      const m = await createMoment({
        source: "journey_capture",
        type: "general",
        text: text.trim() || null,
        image: photo?.dataURL ?? null,
        imageWidth: photo?.width,
        imageHeight: photo?.height,
        starId: null, // saved without a Star; connecting is optional
      });
      markHint("capture");
      markHint("moments"); // their first Moment — Moments needn't explain itself now
      setSavedId(m.id);
      setStep("saved");
    } catch {
      setError("It didn’t save just now. Try once more?");
    }
    setSaving(false);
  };

  const connect = async (s: Star) => {
    if (!savedId) return;
    await updateMoment(savedId, { starId: s.id });
    setConnectedTo(s);
    setStep("saved");
  };

  return (
    <>
      <FocusPaper open={open} onClose={close} title="Capture a moment" titleId="mc-title-h" className="mc-focus">
              <AnimatePresence mode="wait" initial={false}>
                {step === "options" && (
                  <motion.div key="o" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="t-card-title mc-title">Capture a moment</p>
                    {firstTime && <p className="t-body mc-sub">Save something from the life you’re walking through.</p>}
                    <button type="button" className="ds-btn ds-btn--secondary ds-btn--block mc-option" onClick={() => cameraRef.current?.click()}>
                      Take a photo
                    </button>
                    <button type="button" className="ds-btn ds-btn--secondary ds-btn--block mc-option" onClick={() => setStep("capture")}>
                      Write a note
                    </button>
                    <button type="button" className="ds-text-action mc-quiet" onClick={() => libraryRef.current?.click()}>
                      or choose a photo from your library
                    </button>
                    {error && <p className="ds-error mc-error" role="alert">{error}</p>}
                  </motion.div>
                )}
                {step === "capture" && (
                  <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="t-card-title mc-title">{photo ? "A few words, if you like" : "Write a note"}</p>
                    {photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="mc-photo" src={photo.dataURL} alt="Your moment" />
                    )}
                    <textarea
                      className="ds-field mc-input"
                      rows={photo ? 2 : 3}
                      maxLength={240}
                      placeholder={photo ? "What was happening?" : "What do you want to remember?"}
                      value={text}
                      autoFocus={!photo}
                      onChange={(e) => setText(e.target.value)}
                    />
                    {error && <p className="ds-error mc-error" role="alert">{error}</p>}
                    <button type="button" className="ds-btn ds-btn--primary ds-btn--block" disabled={!canSave || saving} onClick={save}>
                      Save moment
                    </button>
                  </motion.div>
                )}
                {step === "saved" && (
                  <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="t-card-title mc-title">Kept.</p>
                    <p className="t-body mc-sub">
                      {connectedTo ? `It’s part of “${connectedTo.wish}” now, and in your Moments.` : "It’s in your Moments."}
                    </p>
                    <button type="button" className="ds-btn ds-btn--primary ds-btn--block" onClick={close}>
                      Done
                    </button>
                    {!connectedTo && stars.length > 0 && (
                      <button type="button" className="ds-text-action mc-quiet" onClick={() => setStep("connect")}>
                        Connect to a Star
                      </button>
                    )}
                  </motion.div>
                )}
                {step === "connect" && (
                  <motion.div key="k" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="t-card-title mc-title">Connect to a Star</p>
                    <p className="t-body mc-sub">Only if it feels part of that wish.</p>
                    <div className="mc-stars">
                      {stars.map((s) => (
                        <button key={s.id} type="button" className="ds-star-row mc-star" onClick={() => connect(s)}>
                          <StarGlyph size={18} className="ds-star-row-glyph" />
                          <span className="ds-star-row-main"><span className="ds-star-row-title">{s.wish}</span></span>
                        </button>
                      ))}
                    </div>
                    <button type="button" className="ds-text-action mc-quiet" onClick={() => setStep("saved")}>
                      Not now
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
      </FocusPaper>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={libraryRef} type="file" accept="image/*" hidden onChange={onFile} />
      <style jsx global>{`
        .mc-focus .ds-focus-title { font-family: var(--font-ui); font-weight: 500; font-size: var(--text-meta); color: var(--ink-60); }
        .mc-title { margin: 0 0 12px; }
        .mc-sub { margin: 0 0 16px; color: var(--ink-80); }
        .mc-option { margin-bottom: 10px; }
        .mc-quiet { display: flex; margin: 4px auto 0; }
        .mc-photo { display: block; width: 100%; max-height: 34dvh; object-fit: cover; border-radius: 4px; margin-bottom: 12px; }
        .mc-input { margin-bottom: 16px; }
        .mc-error { margin: -6px 0 12px; }
        .mc-stars { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
      `}</style>
    </>
  );
}

function compress(dataURL: string, maxDim: number, quality: number): Promise<{ dataURL: string; width: number; height: number }> {
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
