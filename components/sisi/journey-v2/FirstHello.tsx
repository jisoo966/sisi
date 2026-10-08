"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { IconButton, IconSend, TextAction, useKeyboardInset } from "@/components/ds";
import { takeKeyboard } from "@/lib/keyboard";

/**
 * FirstHello — the first moment in the meadow. Sísí has stopped and asks
 * "Hello. I'm Sísí. What should I call you?" (her bubble); right below, where
 * the eye goes next, a single line to answer in — like replying to her —
 * resting on the keyboard (or 16px above the bottom). Small enough never to
 * cover her. Under it, quietly, "I already have an account".
 */
export function FirstHello({
  open,
  value,
  onChange,
  onSubmit,
}: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const router = useRouter();
  useKeyboardInset(open);
  const can = !!value.trim();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="hello"
          className="fh-wrap"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 1.1, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, y: 14, transition: { duration: 0.25 } }}
        >
          <form
            className="fh-row ds-paper ds-deckle"
            onSubmit={(e) => {
              e.preventDefault();
              if (can) onSubmit();
            }}
          >
            <input
              className="ds-field fh-field"
              type="text"
              value={value}
              maxLength={24}
              autoComplete="given-name"
              placeholder="Your name"
              aria-label="What should Sísí call you?"
              onFocus={(e) => takeKeyboard(e.currentTarget)}
              onChange={(e) => onChange(e.target.value)}
            />
            <IconButton type="submit" label="Continue" className="fh-send" disabled={!can} onMouseDown={(e) => e.preventDefault()}>
              <IconSend />
            </IconButton>
          </form>
          <TextAction surface="dark" className="fh-quiet" onClick={() => router.push("/login")}>
            I already have an account
          </TextAction>
          <style jsx global>{`
            .fh-wrap {
              position: fixed; left: 0; right: 0; margin: 0 auto; z-index: var(--z-modal);
              width: min(calc(100% - 2 * max(16px, var(--safe-left), var(--safe-right))), 420px);
              bottom: max(calc(12px + var(--safe-bottom)), calc(var(--ds-kb, 0px) + 12px));
              display: flex; flex-direction: column; align-items: stretch; gap: 2px;
              transition: bottom 220ms var(--ease-sisi);
            }
            /* one line on paper, like answering her: the field and a send mark */
            .fh-row { display: flex; align-items: center; gap: var(--space-2); padding: 10px 10px 10px 12px; --paper-grain-layer: var(--grain-focus); filter: drop-shadow(0 8px 20px rgba(16, 45, 50, 0.3)); }
            .fh-field { flex: 1; min-width: 0; min-height: 48px; border-radius: 999px; padding: 0 18px; font-family: var(--font-editorial); font-size: 18px; }
            .fh-send { flex: none; background: var(--sisi-ink); color: var(--sisi-paper); }
            .fh-send:disabled { background: var(--ink-14); color: var(--ink-35); }
            .fh-quiet { align-self: center; }
            html.kb-open .fh-quiet { display: none; } /* keyboard up: only what's needed */
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
