"use client";

import Link from "next/link";
import { forwardRef, useEffect, useRef, useState } from "react";
import { IconMore } from "./icons";

/**
 * Sísí buttons — the only button styles in the app.
 *
 *   <PrimaryButton onClick={save} loading={saving}>Keep this in Moments</PrimaryButton>
 *   <PrimaryButton surface="dark">Stay with my Star</PrimaryButton>   // on Star World / blue Journey
 *   <SecondaryButton>Edit moment</SecondaryButton>
 *   <TextAction>Not now</TextAction>
 *   <IconButton label="Close" onClick={close}><IconClose /></IconButton>
 *
 * Rules: one primary per view; never gold/coral/blue CTAs; while `loading`
 * the button keeps its width and ignores repeat presses.
 */

export type Surface = "paper" | "dark";

type Common = {
  surface?: Surface;
  block?: boolean;
  loading?: boolean;
  /** render as a Next link */
  href?: string;
  className?: string;
  children: React.ReactNode;
};
type BtnProps = Common & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const BaseButton = forwardRef<HTMLButtonElement, BtnProps & { variant: "primary" | "secondary" }>(function BaseButton(
  { variant, surface = "paper", block, loading, href, className, children, disabled, onClick, type = "button", ...rest },
  ref,
) {
  const c = cls(
    "ds-btn",
    `ds-btn--${variant}`,
    surface === "dark" && "ds-on-dark",
    block && "ds-btn--block",
    loading && "is-loading",
    className,
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={c} onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}>
        <span className="ds-btn-label">{children}</span>
      </Link>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      className={c}
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      <span className="ds-btn-label">{children}</span>
      {loading && <span className="ds-spinner" aria-hidden />}
    </button>
  );
});

export const PrimaryButton = forwardRef<HTMLButtonElement, BtnProps>(function PrimaryButton(p, ref) {
  return <BaseButton ref={ref} variant="primary" {...p} />;
});

export const SecondaryButton = forwardRef<HTMLButtonElement, BtnProps>(function SecondaryButton(p, ref) {
  return <BaseButton ref={ref} variant="secondary" {...p} />;
});

export const TextAction = forwardRef<HTMLButtonElement, BtnProps>(function TextAction(
  { surface = "paper", href, className, children, loading, block: _b, type = "button", ...rest },
  ref,
) {
  const c = cls("ds-text-action", surface === "dark" && "ds-on-dark", className);
  if (href) return <Link href={href} className={c}>{children}</Link>;
  return (
    <button ref={ref} type={type} className={c} aria-busy={loading || undefined} {...rest}>
      {children}
    </button>
  );
});

type IconBtnProps = {
  /** accessible name (required — icons never stand alone) */
  label: string;
  surface?: Surface;
  filled?: boolean;
  /** quiet: no visible circle at rest; a faint warm-ivory wash on press */
  quiet?: boolean;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "aria-label">;

export const IconButton = forwardRef<HTMLButtonElement, IconBtnProps>(function IconButton(
  { label, surface = "paper", filled, quiet, href, className, children, type = "button", ...rest },
  ref,
) {
  const c = cls("ds-icon-btn", surface === "dark" && "ds-on-dark", filled && "ds-icon-btn--filled", quiet && "ds-icon-btn--quiet", className);
  if (href) return <Link href={href} className={c} aria-label={label}>{children}</Link>;
  return (
    <button ref={ref} type={type} className={c} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
});

/* ── Three-dot menu, the only home of destructive actions ─────────────── */

export type MenuItem = {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
};

export function OverflowMenu({
  items,
  label = "More options",
  surface = "paper",
}: {
  items: MenuItem[];
  label?: string;
  surface?: Surface;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const first = root.current?.querySelector<HTMLButtonElement>(".ds-menu-item");
    first?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="ds-menu" ref={root}>
      <IconButton ref={btn} label={label} surface={surface} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <IconMore />
      </IconButton>
      {open && (
        <ul className="ds-menu-list" role="menu">
          {items.map((it) => (
            <li key={it.label} role="none">
              <DestructiveMenuAction
                destructive={it.destructive}
                icon={it.icon}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
              >
                {it.label}
              </DestructiveMenuAction>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A menu row. `destructive` rows are coral and should open a ConfirmationDialog. */
export function DestructiveMenuAction({
  children,
  onClick,
  icon,
  destructive = true,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button type="button" role="menuitem" className={cls("ds-menu-item", destructive && "ds-menu-item--destructive")} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
