"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { addSign } from "@/lib/myStars";
import { savePostcard } from "@/lib/postcards";
import { tornEdge } from "@/lib/tornEdge";
import { linkMoment } from "@/lib/momentLinks";

/**
 * MomentCapture — the camera tool. Not general photography: it keeps a
 * Moment or Sign noticed along the journey, connected to the Current Star.
 *
 *   options  Take a photo · Choose from library · Write only
 *   capture  "Did you notice a Sign?" (+ the photo) · "What was it?"
 *            → Save moment
 *
 * Optional, and never required to receive a Light.
 */

type Step = "options" | "capture" | "saved";
const EDGE = tornEdge(31);

export function MomentCapture({
  open,
  star,
  onClose,
}: {
  open: boolean;
  star: Star | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("options");
  const [photo, setPhoto] = useState<{ dataURL: string; width: number; height: number } | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("options");
    setPhoto(null);
    setText("");
    setSaving(false);
    setError("");
  }, [open]);

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

  const save = async () => {
    const note = text.trim();
    if (!note || saving) return;
    setSaving(true);
    setError("");
    try {
      const card = photo
        ? await savePostcard({ text: note, imageDataURL: photo.dataURL, width: photo.width, height: photo.height, takenAt: new Date().toISOString() })
        : null;
      const sign = star ? await addSign(star.id, note) : null;
      if (card && star) linkMoment(card.id, star.id, sign?.id);
      setStep("saved");
      setTimeout(onClose, 1400);
    } catch {
      setError("It didn’t save just now. Try once more?");
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="mc-backdrop"
            type="button"
            aria-label="Close"
            className="mc-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            key="mc-sheet"
            className="mc-sheet"
            role="dialog"
            aria-label="Keep a moment"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "115%", transition: { duration: 0.35 } }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="mc-shadow" aria-hidden />
            <motion.div layout className="mc-paper paper-bg">
              <span className="mc-handle" aria-hidden />
              <AnimatePresence mode="wait" initial={false}>
                {step === "options" && (
                  <motion.div key="o" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="mc-title">Keep a moment</p>
                    <button type="button" className="mc-option" onClick={() => cameraRef.current?.click()}>Take a photo</button>
                    <button type="button" className="mc-option" onClick={() => libraryRef.current?.click()}>Choose from library</button>
                    <button type="button" className="mc-option" onClick={() => setStep("capture")}>Write only</button>
                    {error && <p className="mc-error">{error}</p>}
                  </motion.div>
                )}
                {step === "capture" && (
                  <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="mc-head">
                      <p className="mc-title">Did you notice a Sign?</p>
                      <span className="mc-stamp" aria-hidden>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/assets/sisi-star-mark-painted-512.png" alt="" />
                      </span>
                    </div>
                    {photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="mc-photo" src={photo.dataURL} alt="Your moment" />
                    )}
                    <textarea
                      className="mc-input"
                      rows={photo ? 2 : 3}
                      maxLength={240}
                      placeholder="What was it?"
                      value={text}
                      autoFocus={!photo}
                      onChange={(e) => setText(e.target.value)}
                    />
                    {error && <p className="mc-error">{error}</p>}
                    <button type="button" className="mc-primary" disabled={!text.trim() || saving} onClick={save}>
                      Save moment
                    </button>
                  </motion.div>
                )}
                {step === "saved" && (
                  <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="mc-title">Kept.</p>
                    <p className="mc-sub">{star ? "It’s part of your Star’s journey now." : "It’s in your Moments now."}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
            <input ref={libraryRef} type="file" accept="image/*" hidden onChange={onFile} />
          </motion.div>

          <style jsx global>{`
            .mc-backdrop { position: absolute; inset: 0; z-index: 24; border: 0; padding: 0; background: rgba(12,20,38,0.12); pointer-events: auto; }
            .mc-sheet { position: absolute; left: max(14px, var(--safe-left)); right: max(14px, var(--safe-right)); bottom: calc(var(--safe-bottom) + 14px); z-index: 25; pointer-events: auto; }
            .mc-shadow { position: absolute; inset: 14px 6px -6px 6px; border-radius: 12px; background: rgba(0,0,0,0.38); filter: blur(14px); }
            .mc-paper { position: relative; padding: 26px 22px 20px; clip-path: ${EDGE}; color: #2b2f45; }
            .mc-handle { position: absolute; top: 10px; left: 50%; width: 34px; height: 3px; margin-left: -17px; border-radius: 3px; background: rgba(43,47,69,0.18); }
            .mc-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
            .mc-title { font-family: var(--font-fraunces), Georgia, serif; font-size: 21px; margin: 4px 0 12px; }
            .mc-sub { font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px; color: rgba(43,47,69,0.7); margin: 0 0 6px; }
            .mc-stamp { width: 38px; height: 38px; border: 1.5px dashed rgba(196,132,124,0.8); border-radius: 3px; transform: rotate(5deg); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .mc-stamp img { width: 26px; height: 26px; }
            .mc-option { display: block; width: 100%; height: 50px; margin-bottom: 10px; border-radius: 14px; border: 1px solid rgba(43,47,69,0.13); background: rgba(255,255,255,0.5); font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; color: #2b2f45; cursor: pointer; }
            .mc-photo { display: block; width: 100%; max-height: 34vh; object-fit: cover; border-radius: 4px; margin-bottom: 12px; box-shadow: 0 1px 0 rgba(0,0,0,0.08); }
            .mc-input { width: 100%; resize: none; padding: 12px 14px; margin-bottom: 12px; border-radius: 10px; border: 1px solid rgba(43,47,69,0.16); background: rgba(255,255,255,0.55); font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; color: #2b2f45; outline: none; }
            .mc-input::placeholder { font-style: italic; color: rgba(43,47,69,0.4); }
            .mc-primary { display: block; width: 100%; height: 48px; border: 0; border-radius: 999px; background: #3d74d8; color: #f7f2e3; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; cursor: pointer; }
            .mc-primary:disabled { opacity: 0.45; }
            .mc-error { font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 14px; color: #a4574a; margin: 0 0 10px; }
          `}</style>
        </>
      )}
    </AnimatePresence>
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
