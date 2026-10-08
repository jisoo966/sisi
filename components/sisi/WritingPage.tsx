"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton, IconCamera, IconClose, IconImage, PrimaryButton, StarGlyph, useKeyboardInset } from "@/components/ds";
import { MomentsSharedStyles, Postcard } from "@/components/sisi/moments/shared";
import { takeKeyboard } from "@/lib/keyboard";
import type { Star } from "@/lib/myStars";

/**
 * WritingPage — where a Moment is written: the question is the page.
 *
 *   ┌ sky ────────────────────────────────┐
 *   │ ✦ the wish it belongs to        ✕  │  ← information about this record
 *   │        (postcard photo)             │
 *   │ What did you notice today?          │  ← the question is the placeholder,
 *   │                                     │    the words are the size a Moment
 *   │ [photo] [camera]            [Save]  │  ← is shown in (dialogue)
 *   └ keyboard ───────────────────────────┘    actions ride on the keyboard
 *
 * The Moments paper (memory grain, torn top edge, a soft shadow) over the
 * world. Writing is always "now", so no date is shown. The keyboard opens
 * with the page (the tap that opened it primes it — lib/keyboard).
 */

export type WritingPhoto = { dataURL: string; width: number; height: number };

export function WritingPage({
  open,
  onClose,
  question,
  text,
  onText,
  photo = null,
  onPhoto,
  onRemovePhoto,
  wish = null,
  wishes = [],
  onWish,
  extra,
  saving = false,
  canSave,
  onSave,
  error,
  maxLength = 240,
  label = "Write a moment",
}: {
  open: boolean;
  onClose: () => void;
  question: string;
  text: string;
  onText: (t: string) => void;
  photo?: WritingPhoto | null;
  /** photos are offered only when this is given */
  onPhoto?: (file: File) => void;
  onRemovePhoto?: () => void;
  /** the wish this record belongs to (null: not connected) */
  wish?: Star | null;
  /** the wishes it may be connected to; empty or no onWish: the wish is fixed */
  wishes?: Star[];
  onWish?: (s: Star | null) => void;
  /** e.g. what kind of note it is, under the header */
  extra?: React.ReactNode;
  saving?: boolean;
  canSave: boolean;
  onSave: (e?: React.MouseEvent<HTMLElement>) => void;
  error?: string;
  maxLength?: number;
  label?: string;
}) {
  useKeyboardInset(open);
  const [picking, setPicking] = useState(false);
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) setPicking(false);
  }, [open]);

  // the field takes the keyboard over once, as the page appears; it grows with the words
  const fit = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  const fieldRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    takeKeyboard(el);
    fit(el);
  }, []);

  const pickable = !!onWish && wishes.length > 0;
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPhoto?.(f);
  };

  if (typeof document === "undefined") return null;
  const root = document.getElementById("sisi-overlay-root") ?? document.body;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="writing"
          className="wp-root"
          role="dialog"
          aria-label={label}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <motion.div
            className="wp-lift"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.32, ease: [0.55, 0, 0.75, 0.2] } }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="wp-sheet">
              <div className="wp-head">
                {/* the wish it belongs to: information about the record, not a tool */}
                <button
                  type="button"
                  className={`ds-chip ds-filter wp-wish${wish ? "" : " is-empty"}`}
                  aria-expanded={pickable ? picking : undefined}
                  disabled={!pickable}
                  onMouseDown={(e) => e.preventDefault()} // the keyboard stays while choosing
                  onClick={() => setPicking((p) => !p)}
                >
                  <StarGlyph size={12} />
                  <span className="wp-wish-label">{wish ? wish.wish : "Connect a Star"}</span>
                </button>
                <IconButton label="Close" onClick={onClose}>
                  <IconClose />
                </IconButton>
              </div>
              {picking && (
                <div className="wp-wishes ds-deckle" role="listbox" aria-label="Connect to a Star">
                  {wishes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="option"
                      aria-selected={wish?.id === s.id}
                      className="wp-wish-option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onWish?.(s);
                        setPicking(false);
                      }}
                    >
                      <StarGlyph size={14} />
                      <span>{s.wish}</span>
                    </button>
                  ))}
                  {wish && (
                    <button
                      type="button"
                      className="wp-wish-option is-none"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onWish?.(null);
                        setPicking(false);
                      }}
                    >
                      No Star
                    </button>
                  )}
                </div>
              )}
              {extra && <div className="wp-extra">{extra}</div>}

              <div className="wp-body">
                {photo && (
                  <div className="wp-photo">
                    <Postcard image={photo.dataURL} className="wp-postcard" />
                    {onRemovePhoto && (
                      <button type="button" className="wp-photo-x" aria-label="Remove the photo" onClick={onRemovePhoto}>
                        <IconClose size={16} />
                      </button>
                    )}
                  </div>
                )}
                <textarea
                  ref={fieldRef}
                  className="wp-field"
                  rows={1}
                  maxLength={maxLength}
                  value={text}
                  placeholder={question}
                  aria-label={question}
                  onChange={(e) => {
                    onText(e.target.value);
                    fit(e.target);
                  }}
                />
                {error && (
                  <p className="ds-error" role="alert">
                    {error}
                  </p>
                )}
              </div>

              {/* the actions ride on the keyboard */}
              <div className="wp-tools">
                {onPhoto && (
                  <>
                    <IconButton label="Add a photo" onMouseDown={(e) => e.preventDefault()} onClick={() => libraryRef.current?.click()}>
                      <IconImage />
                    </IconButton>
                    <IconButton label="Take a photo" onMouseDown={(e) => e.preventDefault()} onClick={() => cameraRef.current?.click()}>
                      <IconCamera />
                    </IconButton>
                  </>
                )}
                <span className="wp-tools-gap" />
                <PrimaryButton className="wp-save" loading={saving} disabled={!canSave || saving} onMouseDown={(e) => e.preventDefault()} onClick={onSave}>
                  Save
                </PrimaryButton>
              </div>
            </div>
          </motion.div>
          <input ref={libraryRef} type="file" accept="image/*" hidden onChange={onFile} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
          <MomentsSharedStyles />
          <style jsx global>{`
            .wp-root { position: fixed; inset: 0; z-index: var(--z-modal); pointer-events: none; }
            .wp-root > * { pointer-events: auto; }
            /* the sheet rests on the world: a soft shadow along its torn top edge */
            .wp-lift {
              position: absolute; left: 0; right: 0; bottom: 0; top: calc(var(--safe-top) + 64px);
              filter: drop-shadow(0 -3px 6px rgba(16, 45, 50, 0.32)) drop-shadow(0 -10px 24px rgba(16, 45, 50, 0.26));
            }
            /* the Moments paper: memory grain, a torn top edge, rounded top corners */
            .wp-sheet {
              position: absolute; inset: 0; display: flex; flex-direction: column; color: var(--sisi-ink);
              background: var(--sisi-paper) var(--grain-memory) 0 0 / var(--grain-size); background-blend-mode: multiply;
              -webkit-mask: var(--deckle-mask-sheet); mask: var(--deckle-mask-sheet);
              border-radius: 18px 18px 0 0;
              --wp-bottom: max(var(--ds-kb, 0px), var(--safe-bottom));
            }
            .wp-head {
              flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px;
              /* paper edge · 16 · the row; sides on the screen gutter (as Moments) */
              --wp-gutter: var(--stage-padding, clamp(16px, 5vw, 24px)); /* the overlay sits outside the stage */
              padding: var(--space-4) calc(var(--wp-gutter) - 10px) 0 var(--wp-gutter);
            }
            .wp-wish { display: inline-flex; align-items: center; gap: 6px; min-width: 0; max-width: calc(100% - 56px); }
            .wp-wish:disabled { opacity: 1; cursor: default; }
            .wp-wish.is-empty { color: var(--ink-60); }
            .wp-wish-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .wp-wishes {
              position: absolute; z-index: 5; left: var(--space-5); top: 60px; min-width: 220px; max-width: calc(100% - 2 * var(--space-5));
              display: flex; flex-direction: column; padding: 6px;
            }
            .wp-wish-option {
              display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 8px 12px; border: 0; background: none;
              text-align: left; color: var(--sisi-ink); font-family: var(--font-editorial); font-size: var(--text-body); cursor: pointer; border-radius: 10px;
            }
            .wp-wish-option[aria-selected="true"], .wp-wish-option:hover { background: var(--ink-08); }
            .wp-wish-option.is-none { font-style: italic; color: var(--ink-60); }
            .wp-extra { flex: none; padding: var(--space-3) var(--space-5) 0; }
            .wp-body {
              flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
              padding: var(--space-6) var(--space-6) calc(var(--wp-bottom) + 80px);
              scrollbar-width: none;
            }
            .wp-body::-webkit-scrollbar { display: none; }
            /* the postcard: lifted off the page a little; 24px above the words */
            .wp-photo { position: relative; width: 140px; margin: 0 auto var(--space-6); transform: rotate(-2.5deg); }
            .wp-postcard { width: 100%; filter: drop-shadow(0 1px 2px rgba(16, 45, 50, 0.14)) drop-shadow(0 8px 16px rgba(16, 45, 50, 0.16)); }
            .wp-postcard > .mm-art:first-child { filter: none; }
            .wp-photo-x {
              position: absolute; top: 4px; right: -6px; width: 28px; height: 28px; border-radius: 50%; border: 0;
              display: inline-flex; align-items: center; justify-content: center; background: var(--sisi-paper); color: var(--sisi-ink);
              box-shadow: 0 1px 4px rgba(16, 45, 50, 0.25); cursor: pointer;
            }
            /* the words are the size a Moment is shown in */
            .wp-field {
              display: block; width: 100%; min-height: 48px; resize: none; overflow: hidden; border: 0; outline: none; padding: 0; margin: 0;
              background: none; color: var(--sisi-ink);
              font-family: var(--font-editorial); font-weight: 300; font-size: var(--text-dialogue); line-height: var(--leading-dialogue);
              letter-spacing: var(--tracking-editorial);
            }
            .wp-field::placeholder { color: var(--ink-35); }
            .wp-tools {
              position: absolute; left: 0; right: 0; bottom: var(--wp-bottom); z-index: 3;
              display: flex; align-items: center; gap: 2px; padding: 6px var(--space-4) 8px calc(var(--space-4) - 10px);
              transition: bottom 220ms var(--ease-sisi);
            }
            .wp-tools-gap { flex: 1; }
            .wp-save { min-height: 40px !important; height: 40px; padding: 0 20px !important; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    root,
  );
}
