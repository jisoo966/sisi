"use client";

import { useState } from "react";
import {
  ConfirmationDialog,
  FilterChip,
  FocusPaper,
  IconButton,
  IconCamera,
  IconClose,
  IconList,
  IconPencil,
  IconTrash,
  IconUnlink,
  MemoryPaper,
  ModalDialog,
  ModalPortal,
  OverflowMenu,
  PrimaryButton,
  SecondaryButton,
  SisiSpeechBubble,
  StarConnectionRow,
  StatusChip,
  StickerNavigation,
  TextAction,
} from "@/components/ds";

/**
 * /test-ui — the design-system sheet. Every shared component and variant on
 * one page, for visual sign-off on each device size. Not linked from the app.
 */
export default function DesignSystemSheet() {
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [focus, setFocus] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <main className="ds-screen ds-screen--paper ds-scroll" style={{ paddingBottom: 140 }}>
      <header className="ds-screen-head">
        <h1 className="ds-screen-title">Design system</h1>
        <IconButton label="Camera"><IconCamera /></IconButton>
        <IconButton label="List"><IconList /></IconButton>
      </header>

      <Section title="Typography">
        <p className="t-display" style={{ margin: 0 }}>What is meant for you</p>
        <p className="t-screen-title" style={{ margin: "8px 0 0" }}>Your Stars</p>
        <p className="t-card-title" style={{ margin: "8px 0 0" }}>A home by the sea with a small garden</p>
        <p className="t-dialogue" style={{ margin: "8px 0 0" }}>I&apos;m here. Tell me what feels heavy today.</p>
        <p className="t-body" style={{ margin: "8px 0 0" }}>I walked past the old bookshop and remembered why I started. Long text wraps onto new lines without collisions and never truncates.</p>
        <p className="t-affirmation" style={{ margin: "8px 0 0" }}>It is already on its way.</p>
        <p className="t-meta" style={{ margin: "8px 0 0" }}>Sep 29, 2026 · 2:14 PM</p>
        <p className="t-helper" style={{ margin: "4px 0 0" }}>Only you can see this.</p>
      </Section>

      <Section title="Colour">
        <div style={{ display: "flex", gap: 8 }}>
          {["blue", "ink", "paper", "gold", "coral"].map((c) => (
            <div key={c} style={{ flex: 1 }}>
              <div style={{ height: 44, borderRadius: 10, background: `var(--sisi-${c})`, border: "1px solid var(--ink-14)" }} />
              <p className="t-helper" style={{ margin: "4px 0 0", textAlign: "center" }}>{c}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons on paper">
        <div className="ds-actions" style={{ marginTop: 0 }}>
          <PrimaryButton block loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>
            Keep this in Moments
          </PrimaryButton>
          <SecondaryButton block>Edit moment</SecondaryButton>
          <TextAction>Not now</TextAction>
        </div>
      </Section>

      <Section title="Buttons on dark" dark>
        <div className="ds-actions" style={{ marginTop: 0 }}>
          <PrimaryButton block surface="dark">Stay with my Star</PrimaryButton>
          <SecondaryButton block surface="dark">View journey</SecondaryButton>
          <TextAction surface="dark">End quietly</TextAction>
        </div>
      </Section>

      <Section title="Chips">
        <div className="ds-chip-row">
          {["All", "Wishes", "Signs"].map((f) => (
            <FilterChip key={f} selected={filter === f} onClick={() => setFilter(f)}>{f}</FilterChip>
          ))}
        </div>
        <div className="ds-chip-row" style={{ marginTop: 12 }}>
          <StatusChip tone="star">Still walking</StatusChip>
          <StatusChip>Fulfilled</StatusChip>
          <StatusChip>Resting</StatusChip>
        </div>
      </Section>

      <Section title="Speech bubble" sky>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, alignItems: "flex-start", padding: "8px 0 20px" }}>
          <SisiSpeechBubble message="Tap Sísí whenever you want to talk." tailPosition="right" />
          <SisiSpeechBubble message="That sounds like a lot to carry. What part of it feels heaviest right now?" tailPosition="left" align="left" />
          <SisiSpeechBubble message="Welcome back." tailPosition="center" />
        </div>
      </Section>

      <Section title="Memory paper">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MemoryPaper meta="Sep 28 · Something good" text="The barista remembered my name." onClick={() => setModal(true)} ariaLabel="Open Moment" />
          <MemoryPaper
            meta="Sep 20 · Star note"
            text="A longer reflection that keeps going so the paper grows with its words. Nothing is cut off; the torn edges stay at the top and bottom however tall it becomes."
            image="/V2/fox-walk/fox-walk-preview.png"
          />
        </div>
      </Section>

      <Section title="Overlays">
        <div className="ds-actions" style={{ marginTop: 0 }}>
          <SecondaryButton block onClick={() => setModal(true)}>Open Moment detail</SecondaryButton>
          <SecondaryButton block onClick={() => setFocus(true)}>Open focus paper</SecondaryButton>
          <SecondaryButton block onClick={() => setConfirm(true)}>Open confirmation</SecondaryButton>
        </div>
      </Section>

      <ModalPortal open={modal} onClose={() => setModal(false)} labelledBy="ds-demo-title">
        <ModalDialog
          onClose={() => setModal(false)}
          title={<p className="t-meta" id="ds-demo-title" style={{ margin: 0 }}>Sep 28, 2026</p>}
          menu={
            <OverflowMenu
              items={[
                { label: "Disconnect from Star", icon: <IconUnlink size={18} />, onSelect: () => {}, destructive: false },
                { label: "Delete moment", icon: <IconTrash size={18} />, onSelect: () => setConfirm(true), destructive: true },
              ]}
            />
          }
          actions={
            <div className="ds-actions ds-actions--row">
              <SecondaryButton><IconPencil size={18} /> Edit moment</SecondaryButton>
              <PrimaryButton>Visit Star</PrimaryButton>
            </div>
          }
        >
          <p className="t-dialogue" style={{ margin: 0 }}>The barista remembered my name.</p>
          <div style={{ marginTop: 20 }}>
            <StarConnectionRow title="A home by the sea with a small garden" status="Still walking" onClick={() => {}} />
          </div>
        </ModalDialog>
      </ModalPortal>

      <ConfirmationDialog
        open={confirm}
        destructive
        title="Delete this Moment?"
        message="It will be removed everywhere it appears."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />

      <FocusPaper
        open={focus}
        onClose={() => setFocus(false)}
        title="Sísí"
        titleId="ds-focus-title"
        footer={
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea className="ds-field" rows={1} placeholder="Say anything…" aria-label="Message" />
            <IconButton label="Close keyboard" filled><IconClose /></IconButton>
          </div>
        }
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <p key={i} className="t-dialogue" style={{ margin: "0 0 14px" }}>
            {i % 2 ? "I hear you. What would feel like a gentle first step?" : "I've been feeling a bit lost lately and I don't know where to start."}
          </p>
        ))}
      </FocusPaper>

      <div className="ds-nav-host">
        <StickerNavigation activeTab="journey" still />
      </div>
    </main>
  );
}

function Section({ title, children, dark, sky }: { title: string; children: React.ReactNode; dark?: boolean; sky?: boolean }) {
  return (
    <section
      style={{
        marginBottom: 28,
        padding: dark || sky ? 20 : 0,
        borderRadius: 16,
        background: dark ? "var(--sisi-ink)" : sky ? "var(--sisi-blue)" : undefined,
      }}
    >
      <p className="ds-kicker" style={dark ? { color: "var(--paper-60)" } : undefined}>{title}</p>
      {children}
    </section>
  );
}
