"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { loadStars, walkingStars } from "@/lib/myStars";
import { createMoment, updateMoment } from "@/lib/momentStore";
import { hintDone, markHint } from "@/lib/hints";
import { tornEdge } from "@/lib/tornEdge";

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
const EDGE = tornEdge(31);

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
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="mc-backdrop"
            type="button"
            aria-label="Close"
            className="mc-backdrop"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            key="mc-sheet"
            className="mc-sheet"
            role="dialog"
            aria-label="Capture a moment"
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
                    <p className="mc-title">Capture a moment</p>
                    {firstTime && <p className="mc-sub">Save something from the life you’re walking through.</p>}
                    <button type="button" className="mc-option" onClick={() => cameraRef.current?.click()}>
                      Take a photo
                    </button>
                    <button type="button" className="mc-option" onClick={() => setStep("capture")}>
                      Write a note
                    </button>
                    <button type="button" className="mc-quiet" onClick={() => libraryRef.current?.click()}>
                      or choose a photo from your library
                    </button>
                    {error && <p className="mc-error">{error}</p>}
                  </motion.div>
                )}
                {step === "capture" && (
                  <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="mc-title">{photo ? "A few words, if you like" : "Write a note"}</p>
                    {photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="mc-photo" src={photo.dataURL} alt="Your moment" />
                    )}
                    <textarea
                      className="mc-input"
                      rows={photo ? 2 : 3}
                      maxLength={240}
                      placeholder={photo ? "What was happening?" : "What do you want to remember?"}
                      value={text}
                      autoFocus={!photo}
                      onChange={(e) => setText(e.target.value)}
                    />
                    {error && <p className="mc-error">{error}</p>}
                    <button type="button" className="mc-primary" disabled={!canSave || saving} onClick={save}>
                      Save moment
                    </button>
                  </motion.div>
                )}
                {step === "saved" && (
                  <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="mc-title">Kept.</p>
                    <p className="mc-sub">
                      {connectedTo ? `It’s part of “${connectedTo.wish}” now, and in your Moments.` : "It’s in your Moments."}
                    </p>
                    <button type="button" className="mc-primary" onClick={close}>
                      Done
                    </button>
                    {!connectedTo && stars.length > 0 && (
                      <button type="button" className="mc-quiet" onClick={() => setStep("connect")}>
                        Connect to a Star
                      </button>
                    )}
                  </motion.div>
                )}
                {step === "connect" && (
                  <motion.div key="k" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="mc-title">Connect to a Star</p>
                    <p className="mc-sub">Only if it feels part of that wish.</p>
                    <div className="mc-stars">
                      {stars.map((s) => (
                        <button key={s.id} type="button" className="mc-option mc-star" onClick={() => connect(s)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/assets/sisi-star-mark-painted-512.png" alt="" aria-hidden />
                          <span>{s.wish}</span>
                        </button>
                      ))}
                    </div>
                    <button type="button" className="mc-quiet" onClick={() => setStep("saved")}>
                      Not now
                    </button>
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
            .mc-quiet { display: block; margin: 6px auto 0; min-height: 44px; padding: 0 12px; border: 0; background: transparent; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15.5px; color: #3d74d8; cursor: pointer; }
            .mc-stars { display: flex; flex-direction: column; max-height: 38vh; overflow-y: auto; }
            .mc-star { display: flex; align-items: center; gap: 10px; text-align: left; padding: 0 14px; }
            .mc-star img { width: 20px; height: 20px; flex: 0 0 auto; }
            .mc-star span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
