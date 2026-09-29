"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { addSign, createStar, saveStar } from "@/lib/myStars";
import { savePostcard } from "@/lib/postcards";
import { FocusPaper } from "@/components/ds";
import { linkMoment } from "@/lib/momentLinks";

/**
 * CreateStarFlow — brief, two steps, on torn paper over the world.
 *
 *   1  Define the Star   "What would you like to move toward?"
 *                        (optional) "Why does this matter to you?"
 *                        → Create my Star
 *   2  Vision Postcard   one image + "What do you see?" + "How does it feel?"
 *                        → Save to my Star      (or "Not now")
 *
 * The why and the postcard words go onto the new Star's timeline; the
 * postcard (with its image) is also kept in Moments.
 */


export function CreateStarFlow({
  open,
  existing,
  onClose,
  onCreated,
}: {
  open: boolean;
  existing: Star[];
  onClose: () => void;
  onCreated: (star: Star) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [wish, setWish] = useState("");
  const [why, setWhy] = useState("");
  const [star, setStar] = useState<Star | null>(null);
  const [image, setImage] = useState<{ dataURL: string; width: number; height: number } | null>(null);
  const [see, setSee] = useState("");
  const [feel, setFeel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setWish("");
    setWhy("");
    setStar(null);
    setImage(null);
    setSee("");
    setFeel("");
    setBusy(false);
    setError("");
    setPicking(false);
  }, [open]);

  const create = async () => {
    const w = wish.trim();
    if (!w || busy) return;
    setBusy(true);
    setError("");
    try {
      const s = createStar(w, "someday", existing);
      await saveStar(s);
      if (why.trim()) await addSign(s.id, why.trim());
      setStar(s);
      setStep(2);
    } catch {
      setError("Your Star didn’t save just now. Try once more?");
    }
    setBusy(false);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    setPicking(false);
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        setImage(await compress(r.result as string, 1200, 0.85));
      } catch {
        setError("That image couldn’t be opened.");
      }
    };
    r.readAsDataURL(f);
  };

  const saveVision = async () => {
    if (!star || busy) return;
    const words = [see.trim(), feel.trim()].filter(Boolean).join(" ");
    setBusy(true);
    try {
      const sign = words ? await addSign(star.id, words) : null;
      if (image) {
        const card = await savePostcard({ text: words || star.wish, imageDataURL: image.dataURL, width: image.width, height: image.height });
        linkMoment(card.id, star.id, sign?.id);
      }
    } catch {
      // the Star itself is saved; the postcard can be added again later
    }
    setBusy(false);
    onCreated(star);
  };

  return (
    <>
      <FocusPaper
        open={open}
        onClose={() => !busy && (step === 1 ? onClose() : star && onCreated(star))}
        title="Create your Star"
        titleId="csf-title-h"
        className="csf-focus"
      >
              <AnimatePresence mode="wait" initial={false}>
                {step === 1 ? (
                  <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="t-card-title csf-title">What would you like to move toward?</p>
                    <input
                      className="ds-field csf-input"
                      value={wish}
                      maxLength={120}
                      autoFocus
                      placeholder="A home filled with light"
                      aria-label="Your wish"
                      onChange={(e) => setWish(e.target.value)}
                    />
                    <label className="ds-label" htmlFor="csf-why">Why does this matter to you? (optional)</label>
                    <textarea
                      id="csf-why"
                      className="ds-field csf-input"
                      rows={2}
                      maxLength={240}
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                    />
                    {error && <p className="ds-error csf-error" role="alert">{error}</p>}
                    <button type="button" className="ds-btn ds-btn--primary ds-btn--block" disabled={!wish.trim() || busy} onClick={create}>
                      Create my Star
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <button type="button" className="csf-image" onClick={() => setPicking((v) => !v)} aria-label="Add one image">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image.dataURL} alt="" />
                      ) : (
                        <span>Add one image of it</span>
                      )}
                    </button>
                    {picking && (
                      <div className="csf-pick">
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => cameraRef.current?.click()}>Take a photo</button>
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => libraryRef.current?.click()}>Choose from library</button>
                      </div>
                    )}
                    <p className="t-card-title csf-wish">{star?.wish}</p>
                    <input className="ds-field csf-input" placeholder="What do you see?" aria-label="What do you see?" value={see} maxLength={140} onChange={(e) => setSee(e.target.value)} />
                    <input className="ds-field csf-input" placeholder="How does it feel?" aria-label="How does it feel?" value={feel} maxLength={140} onChange={(e) => setFeel(e.target.value)} />
                    <button type="button" className="ds-btn ds-btn--primary ds-btn--block" disabled={busy} onClick={saveVision}>
                      Save to my Star
                    </button>
                    <button type="button" className="ds-text-action csf-link" disabled={busy} onClick={() => star && onCreated(star)}>
                      Not now
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
      </FocusPaper>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={libraryRef} type="file" accept="image/*" hidden onChange={onFile} />
      <style jsx global>{`
        .csf-focus .ds-focus-title { font-family: var(--font-ui); font-weight: 500; font-size: var(--text-meta); color: var(--ink-60); letter-spacing: 0.005em; }
        .csf-title { margin: 0 0 14px; }
        .csf-input { margin-bottom: 12px; }
        .csf-error { margin: -4px 0 12px; }
        .csf-link { display: flex; margin: 8px auto 0; }
        .csf-image {
          display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 4 / 3; padding: 0; margin-bottom: 12px;
          border: 1px dashed var(--ink-35); border-radius: 4px; background: var(--ink-08); overflow: hidden; cursor: pointer;
          font-family: var(--font-editorial); font-style: italic; font-size: var(--text-body); color: var(--ink-60);
        }
        .csf-image img { width: 100%; height: 100%; object-fit: cover; }
        .csf-pick { display: flex; gap: 8px; margin: -4px 0 12px; }
        .csf-pick .ds-btn { flex: 1; padding: 0 10px; }
        .csf-wish { margin: 0 0 12px; }
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
