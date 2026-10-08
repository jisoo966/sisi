"use client";

import { useEffect, useRef, useState } from "react";

/**
 * DevKeyboard — development only, on a computer: an iPhone-sized keyboard
 * rises whenever a text field has focus, so layouts can be tested as they
 * will behave on a phone (cards resting on top of the keyboard).
 *
 * It reports its height exactly as a real keyboard would (--ds-kb, read by
 * useKeyboardInset), and its keys really type into the focused field.
 * Never rendered in production or on touch devices.
 */

const KB_HEIGHT = 307; // iPhone (iOS 26): four rows of keys + the emoji · dictation bar

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["⇧", "z", "x", "c", "v", "b", "n", "m", "⌫"],
];

type Field = HTMLInputElement | HTMLTextAreaElement;
const isField = (el: Element | null): el is Field =>
  !!el &&
  (el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && ["text", "search", "email", "url", ""].includes((el as HTMLInputElement).type))) &&
  !(el as Field).readOnly &&
  !(el as Field).disabled;

export function DevKeyboard() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(false);
  const field = useRef<Field | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    setEnabled(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const report = (h: number) => {
      root.dataset.devKb = String(h);
      root.classList.toggle("kb-open", h > 0);
      root.style.setProperty("--ds-kb", `${h}px`);
    };
    const onIn = (e: FocusEvent) => {
      const t = e.target as Element;
      if (!isField(t)) return;
      field.current = t;
      setOpen(true);
      report(KB_HEIGHT);
    };
    const onOut = () => {
      // wait a tick: focus may just be moving to another field
      setTimeout(() => {
        if (isField(document.activeElement)) return;
        field.current = null;
        setOpen(false);
        setShift(false);
        delete root.dataset.devKb;
        root.classList.remove("kb-open");
        root.style.setProperty("--ds-kb", "0px");
      }, 0);
    };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    if (isField(document.activeElement)) onIn({ target: document.activeElement } as unknown as FocusEvent);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, [enabled]);

  if (!enabled || !open) return null;

  const type = (key: string) => {
    const el = field.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    if (key === "⇧") return setShift((v) => !v);
    if (key === "⌫") {
      if (start === end && start > 0) el.setRangeText("", start - 1, end, "end");
      else el.setRangeText("", start, end, "end");
    } else if (key === "return") {
      if (el.tagName === "TEXTAREA") el.setRangeText("\n", start, end, "end");
      else el.blur();
    } else {
      const ch = key === "space" ? " " : shift ? key.toUpperCase() : key;
      if (el.maxLength > 0 && el.value.length >= el.maxLength) return;
      el.setRangeText(ch, start, end, "end");
      if (shift) setShift(false);
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  // keys never take the focus away from the field
  const press = (key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    type(key);
  };

  return (
    <div className="dev-kb" aria-hidden data-dev-keyboard>
      {ROWS.map((row, i) => (
        <div key={i} className={`dev-kb-row r${i}`}>
          {row.map((k) => (
            <button
              key={k}
              type="button"
              tabIndex={-1}
              className={`dev-kb-key${k === "⇧" || k === "⌫" ? " is-fn" : ""}${k === "⇧" && shift ? " is-on" : ""}`}
              onMouseDown={press(k)}
            >
              {k.length === 1 && shift && k !== "⇧" && k !== "⌫" ? k.toUpperCase() : k}
            </button>
          ))}
        </div>
      ))}
      <div className="dev-kb-row r3">
        <button type="button" tabIndex={-1} className="dev-kb-key is-fn is-123" onMouseDown={(e) => e.preventDefault()}>
          123
        </button>
        <button type="button" tabIndex={-1} className="dev-kb-key is-space" aria-label="space" onMouseDown={press("space")} />
        <button type="button" tabIndex={-1} className="dev-kb-key is-dot" onMouseDown={press(".")}>
          .
        </button>
        <button type="button" tabIndex={-1} className="dev-kb-key is-return" aria-label="return" onMouseDown={press("return")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
        </button>
      </div>
      {/* the emoji · dictation bar under the keys (decorative here) */}
      <div className="dev-kb-foot">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1.8 2 5.2 2 7 0" /><circle cx="9" cy="10" r="0.6" fill="currentColor" /><circle cx="15" cy="10" r="0.6" fill="currentColor" /></svg>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
      </div>
      <style jsx>{`
        /* iOS 26: a rounded, frosted grey slab; light keys; a blue return */
        .dev-kb {
          position: fixed; z-index: 99999; left: 0; right: 0; bottom: 0; height: ${KB_HEIGHT}px;
          padding: 24px 6px 0; box-sizing: border-box; border-radius: 32px;
          background: rgba(214, 217, 223, 0.96); box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.6) inset; -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
          font-family: -apple-system, "SF Pro Text", system-ui, sans-serif; user-select: none;
          animation: devKbIn 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes devKbIn { from { transform: translateY(100%); } to { transform: none; } }
        .dev-kb-row { display: flex; justify-content: center; gap: 6px; height: 42px; margin: 0 0 12px; padding: 0 1px; }
        .dev-kb-row.r1 { padding: 0 20px; }
        .dev-kb-key {
          flex: 1 1 0; min-width: 0; border: 0; border-radius: 9px; background: #fff; color: #000;
          font-size: 24px; font-weight: 400; line-height: 1; padding: 0; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
        }
        .dev-kb-key:active { background: #bfc3ca; }
        .dev-kb-key.is-fn { flex: 1.25 1 0; font-size: 20px; }
        .dev-kb-key.is-on { background: #fff; color: #0a84ff; }
        .dev-kb-row.r2 .dev-kb-key.is-fn:first-child { margin-right: 10px; }
        .dev-kb-row.r2 .dev-kb-key.is-fn:last-child { margin-left: 10px; }
        .dev-kb-key.is-123 { flex: 2.3 1 0; font-size: 17px; }
        .dev-kb-key.is-space { flex: 4.7 1 0; }
        .dev-kb-key.is-dot { flex: 0.9 1 0; font-size: 24px; padding-bottom: 8px; }
        .dev-kb-key.is-return { flex: 1.8 1 0; background: #0a84ff; color: #fff; }
        .dev-kb-key.is-return:active { background: #0066cc; }
        .dev-kb-foot {
          display: flex; justify-content: space-between; align-items: center; height: 52px; padding: 0 30px; color: #000;
        }
      `}</style>
    </div>
  );
}
