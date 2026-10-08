/**
 * lib/keyboard — open the keyboard the moment a writing card is asked for.
 *
 * iOS only shows the keyboard when focus happens inside the tap itself, and
 * the card's field doesn't exist yet at that moment. So the tap focuses a
 * hidden field right away (the keyboard rises); when the card's own field
 * mounts it takes the focus over (`takeKeyboard`) and the keyboard stays.
 * The card is laid out on top of the keyboard from its first frame.
 */

let proxy: HTMLInputElement | null = null;

/** Call synchronously inside the tap that opens a writing card. */
export function primeKeyboard() {
  if (typeof document === "undefined") return;
  if (!proxy) {
    proxy = document.createElement("input");
    proxy.type = "text";
    proxy.setAttribute("aria-hidden", "true");
    proxy.tabIndex = -1;
    // 16px: iOS never zooms; invisible, out of the way, but focusable
    Object.assign(proxy.style, { position: "fixed", top: "0", left: "0", width: "1px", height: "1px", opacity: "0", fontSize: "16px", border: "0", padding: "0", pointerEvents: "none" });
    (document.querySelector(".phone-frame") ?? document.body).appendChild(proxy);
  }
  proxy.focus({ preventScroll: true });
}

/** The card's field takes the keyboard over (never scrolling the world to it). */
export function takeKeyboard(el: HTMLInputElement | HTMLTextAreaElement | null) {
  if (!el) return;
  el.focus({ preventScroll: true });
  const end = el.value.length;
  try {
    el.setSelectionRange(end, end);
  } catch {
    // some input types don't support selection
  }
}
