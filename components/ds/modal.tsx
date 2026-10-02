"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton, PrimaryButton, TextAction } from "./buttons";
import { IconClose } from "./icons";

/**
 * The one overlay system.
 *
 *   ModalPortal ── ModalBackdrop + (ModalDialog | FocusPaper | anything)
 *
 * - renders into #sisi-overlay-root (outside every transformed world
 *   container; inside the phone frame on desktop)
 * - locks page scroll and restores the exact position on close
 * - the page behind becomes inert; focus is trapped and returns to the
 *   element that opened it; Escape closes (unless `dismissible={false}`)
 * - stacked overlays (a confirmation over a detail) behave: only the top
 *   one listens
 */

const stack: symbol[] = [];
let savedScroll = 0;

function overlayRoot(): HTMLElement {
  return document.getElementById("sisi-overlay-root") ?? document.body;
}

function setBackgroundInert(on: boolean) {
  const root = overlayRoot();
  const parent = root.parentElement;
  if (!parent || root === document.body) return;
  for (const el of Array.from(parent.children)) {
    if (el === root) continue;
    if (on) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ModalPortal({
  open,
  onClose,
  children,
  variant = "center",
  dismissible = true,
  labelledBy,
  className = "",
  backdrop = "dim",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** dim: the world steps back · clear: nothing dims or blurs (live previews) */
  backdrop?: "dim" | "clear";
  /** center: dialog in the middle · sheet: paper rising from the bottom */
  variant?: "center" | "sheet";
  /** false for destructive confirmations: Escape and backdrop don't close */
  dismissible?: boolean;
  labelledBy?: string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const id = useRef(Symbol("modal"));
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // mount/unmount with a short fade-out
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, 200);
    return () => clearTimeout(t);
  }, [open, mounted]);

  // scroll lock, inert background, focus management
  useIsoLayoutEffect(() => {
    if (!mounted) return;
    const me = id.current;
    opener.current = document.activeElement as HTMLElement | null;
    if (stack.length === 0) {
      savedScroll = window.scrollY;
      document.documentElement.classList.add("ds-scroll-locked", "ds-overlay-open");
      setBackgroundInert(true);
    }
    stack.push(me);
    const first = box.current?.querySelector<HTMLElement>("[data-autofocus]") ?? box.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? box.current)?.focus({ preventScroll: true });

    return () => {
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) {
        document.documentElement.classList.remove("ds-scroll-locked", "ds-overlay-open");
        setBackgroundInert(false);
        window.scrollTo(0, savedScroll);
      }
      const o = opener.current;
      if (o && document.contains(o)) o.focus({ preventScroll: true });
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id.current) return;
      if (e.key === "Escape" && dismissible) {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !box.current) return;
      const f = Array.from(box.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!f.length) {
        e.preventDefault();
        return;
      }
      const a = f[0];
      const z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, dismissible]);

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={box}
      className={`ds-modal ${variant === "sheet" ? "ds-modal--sheet" : ""} ${backdrop === "clear" ? "ds-modal--clear" : ""} ${closing ? "is-closing" : ""} ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      style={closing ? { opacity: 0, transition: "opacity 200ms ease" } : undefined}
    >
      <ModalBackdrop onClick={dismissible ? () => closeRef.current() : undefined} />
      {children}
    </div>,
    overlayRoot(),
  );
}

export function ModalBackdrop({ onClick }: { onClick?: () => void }) {
  return <div className="ds-backdrop" aria-hidden onClick={onClick} />;
}

/**
 * A centred paper dialog: fixed header (title, optional menu, close),
 * a scrolling body, fixed actions. Height follows the content.
 */
export function ModalDialog({
  title,
  titleId,
  onClose,
  menu,
  actions,
  children,
  className = "",
  hideClose = false,
  style,
}: {
  style?: React.CSSProperties;
  title?: React.ReactNode;
  titleId?: string;
  onClose?: () => void;
  /** e.g. <OverflowMenu items={…} /> — where Delete lives */
  menu?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
}) {
  return (
    <div className={`ds-dialog ds-paper ${className}`} style={style}>
      {(title || menu || (onClose && !hideClose)) && (
        <div className="ds-dialog-head">
          <div className="ds-dialog-heading">{title && typeof title === "string" ? <h2 id={titleId} className="t-card-title" style={{ margin: 0 }}>{title}</h2> : title}</div>
          {menu}
          {onClose && !hideClose && (
            <IconButton label="Close" onClick={onClose}>
              <IconClose />
            </IconButton>
          )}
        </div>
      )}
      <div className="ds-dialog-body">{children}</div>
      {actions && <div className="ds-dialog-foot">{actions}</div>}
    </div>
  );
}

/** Confirmation for anything irreversible. Destructive ones don't close on Escape. */
export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Not now",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  onCancel: () => void;
}) {
  const tid = useId();
  return (
    <ModalPortal open={open} onClose={onCancel} dismissible={!destructive} labelledBy={tid}>
      <ModalDialog
        title={<h2 id={tid} className="t-card-title" style={{ margin: 0 }}>{title}</h2>}
        actions={
          <div className="ds-actions">
            <PrimaryButton block loading={loading} onClick={onConfirm} data-autofocus={destructive ? undefined : ""}>
              {confirmLabel}
            </PrimaryButton>
            <TextAction onClick={onCancel} data-autofocus={destructive ? "" : undefined}>
              {cancelLabel}
            </TextAction>
          </div>
        }
      >
        {message && <p className="t-body" style={{ margin: 0, color: "var(--ink-80)" }}>{message}</p>}
      </ModalDialog>
    </ModalPortal>
  );
}
