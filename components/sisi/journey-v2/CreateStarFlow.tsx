"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { addSign, createStar, saveStar } from "@/lib/myStars";
import { savePostcard } from "@/lib/postcards";
import { tornEdge } from "@/lib/tornEdge";

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

const EDGE = tornEdge(61);

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
      if (image) {
        await savePostcard({ text: words || star.wish, imageDataURL: image.dataURL, width: image.width, height: image.height });
      }
      if (words) await addSign(star.id, words);
    } catch {
      // the Star itself is saved; the postcard can be added again later
    }
    setBusy(false);
    onCreated(star);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cs-backdrop"
            className="cs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => step === 1 && !busy && onClose()}
          />
          <motion.div
            key="cs-sheet"
            className="cs-sheet"
            role="dialog"
            aria-label="Create your Star"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "115%", transition: { duration: 0.35 } }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="cs-shadow" aria-hidden />
            <motion.div layout className="cs-paper paper-bg">
              <span className="cs-handle" aria-hidden />
              <AnimatePresence mode="wait" initial={false}>
                {step === 1 ? (
                  <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="cs-title">What would you like to move toward?</p>
                    <input
                      className="cs-input"
                      value={wish}
                      maxLength={120}
                      autoFocus
                      placeholder="A home filled with light"
                      onChange={(e) => setWish(e.target.value)}
                    />
                    <label className="cs-label" htmlFor="cs-why">Why does this matter to you? <em>(optional)</em></label>
                    <textarea
                      id="cs-why"
                      className="cs-input cs-area"
                      rows={2}
                      maxLength={240}
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                    />
                    {error && <p className="cs-error">{error}</p>}
                    <button type="button" className="cs-primary" disabled={!wish.trim() || busy} onClick={create}>
                      Create my Star
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <button type="button" className="cs-image" onClick={() => setPicking((v) => !v)} aria-label="Add one image">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image.dataURL} alt="" />
                      ) : (
                        <span>Add one image of it</span>
                      )}
                    </button>
                    {picking && (
                      <div className="cs-pick">
                        <button type="button" onClick={() => cameraRef.current?.click()}>Take a photo</button>
                        <button type="button" onClick={() => libraryRef.current?.click()}>Choose from library</button>
                      </div>
                    )}
                    <p className="cs-wish">{star?.wish}</p>
                    <input className="cs-input" placeholder="What do you see?" value={see} maxLength={140} onChange={(e) => setSee(e.target.value)} />
                    <input className="cs-input" placeholder="How does it feel?" value={feel} maxLength={140} onChange={(e) => setFeel(e.target.value)} />
                    <button type="button" className="cs-primary" disabled={busy} onClick={saveVision}>
                      Save to my Star
                    </button>
                    <button type="button" className="cs-link" disabled={busy} onClick={() => star && onCreated(star)}>
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
            .cs-backdrop { position: absolute; inset: 0; z-index: 26; background: rgba(12,20,38,0.18); pointer-events: auto; }
            .cs-sheet { position: absolute; left: max(14px, var(--safe-left)); right: max(14px, var(--safe-right)); bottom: calc(var(--safe-bottom) + 14px); z-index: 27; pointer-events: auto; }
            .cs-shadow { position: absolute; inset: 14px 6px -6px 6px; border-radius: 12px; background: rgba(0,0,0,0.4); filter: blur(14px); }
            .cs-paper { position: relative; padding: 26px 22px 20px; clip-path: ${EDGE}; color: #2b2f45; }
            .cs-handle { position: absolute; top: 10px; left: 50%; width: 34px; height: 3px; margin-left: -17px; border-radius: 3px; background: rgba(43,47,69,0.18); }
            .cs-title { font-family: var(--font-fraunces), Georgia, serif; font-size: 21px; line-height: 1.3; margin: 4px 0 14px; }
            .cs-label { display: block; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px; color: rgba(43,47,69,0.7); margin: 4px 0 6px; }
            .cs-label em { color: rgba(43,47,69,0.45); }
            .cs-input { width: 100%; padding: 12px 14px; margin-bottom: 12px; border-radius: 10px; border: 1px solid rgba(43,47,69,0.16); background: rgba(255,255,255,0.55); font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; color: #2b2f45; outline: none; }
            .cs-input::placeholder { font-style: italic; color: rgba(43,47,69,0.4); }
            .cs-area { resize: none; }
            .cs-primary { display: block; width: 100%; height: 48px; border: 0; border-radius: 999px; background: #3d74d8; color: #f7f2e3; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px; cursor: pointer; }
            .cs-primary:disabled { opacity: 0.45; }
            .cs-link { display: block; margin: 10px auto 0; border: 0; background: transparent; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px; color: rgba(43,47,69,0.6); cursor: pointer; }
            .cs-error { font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 14px; color: #a4574a; margin: 0 0 10px; }
            .cs-image { display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 4 / 3; padding: 0; margin-bottom: 12px; border: 1px dashed rgba(43,47,69,0.25); border-radius: 4px; background: rgba(67,132,227,0.08); overflow: hidden; cursor: pointer; font-family: var(--font-eb-garamond), Georgia, serif; font-style: italic; font-size: 15px; color: rgba(43,47,69,0.55); }
            .cs-image img { width: 100%; height: 100%; object-fit: cover; }
            .cs-pick { display: flex; gap: 8px; margin: -4px 0 12px; }
            .cs-pick button { flex: 1; height: 40px; border-radius: 12px; border: 1px solid rgba(43,47,69,0.13); background: rgba(255,255,255,0.55); font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px; color: #2b2f45; cursor: pointer; }
            .cs-wish { font-family: var(--font-fraunces), Georgia, serif; font-size: 20px; margin: 0 0 10px; }
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
