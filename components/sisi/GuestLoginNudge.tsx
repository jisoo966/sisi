"use client";

import { ModalDialog, ModalPortal, PrimaryButton, StarGlyph, TextAction } from "@/components/ds";

/**
 * GuestLoginNudge — after a guest has used the app for a while, a gentle
 * suggestion to log in (an offer, not a request), in the shared modal.
 *
 * Triggers:
 *   - Messages: opens after five messages
 *   - Journey: reachable at any time from the menu
 */
export function GuestLoginNudge({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <ModalPortal open={open} onClose={onClose} labelledBy="nudge-title">
      <ModalDialog
        onClose={onClose}
        actions={
          <div className="ds-actions">
            <PrimaryButton block href="/login" onClick={onClose}>
              Log in
            </PrimaryButton>
            <TextAction onClick={onClose}>Maybe later</TextAction>
          </div>
        }
      >
        <div style={{ textAlign: "center" }}>
          <StarGlyph size={36} />
          <h2 id="nudge-title" className="t-screen-title" style={{ margin: "12px 0 8px" }}>
            Let me remember your journey
          </h2>
          <p className="t-body" style={{ margin: 0, color: "var(--ink-80)" }}>
            Log in to keep our walks, your Stars, and the Moments you&apos;ve kept, for whenever you return.
          </p>
        </div>
      </ModalDialog>
    </ModalPortal>
  );
}
