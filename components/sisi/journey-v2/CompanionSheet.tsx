"use client";

import { useEffect, useRef, useState } from "react";
import type { Star } from "@/lib/myStars";
import { loadStars, walkingStars } from "@/lib/myStars";
import { createMoment, loadMoments, type MomentType } from "@/lib/momentStore";
import { FilterChip, FocusPaper, IconButton, IconSend, OverflowMenu, PrimaryButton, ReplyChip, StarGlyph, TextAction } from "@/components/ds";
import {
  actionAllowed,
  activeConversation,
  addTurn,
  newConversation,
  parseMeta,
  requestPayload,
  setMeta,
  visibleText,
  type Conversation,
} from "@/lib/sisiConversation";
import { SisiChatCharacter, type SisiChatExpression } from "@/components/sisi/journey-v2/SisiChatCharacter";

/**
 * CompanionSheet — sitting with Sísí, inside the same landscape.
 *
 *   1 open     a tall ivory paper rises above the tabs; Sísí peeks over its
 *              top edge. "I’m here. / What’s on your mind?" with three gentle
 *              ways to begin (I want to talk · Help me with a Star · I’m not sure)
 *   2 listen   the user's words in a soft blue note; Sísí answers on a paper
 *              note. Once per talk, gentle directions:
 *              Just keep talking · See my journey · Find a small step
 *   3 keep?    when Sísí marks the user's words as worth keeping ([SAVE:…]):
 *              Keep this · Add to a Star · Keep talking —
 *              "Nothing is saved unless you choose."
 *   4a         Save as a Moment — an editable quote, "A conversation with Sísí"
 *   4b         Add to a Star — which Star, what kind of note
 *   5 return   "Kept safely in Moments." — Keep talking · Back to Journey
 *
 * The conversation itself is never saved; only the words the user chooses
 * (source sisi_conversation, one canonical Moment).
 *
 * Continuity (lib/sisiConversation): one conversation stays active while
 * the talk continues — closing and reopening the paper resumes it. Each
 * request carries the ordered history, Sísí's rolling summary, the people /
 * pets / places she is tracking, the topic and the stage. The user's words
 * are stored in the thread before the request is made.
 */

/** A reply is prepared with a thoughtful look, held at least this long. */
const MIN_THINK_MS = 700;

type Pill = { label: string; act: () => void; quiet?: boolean };
type Msg = {
  id: string;
  from: "sisi" | "user" | "saved";
  text: string;
  /** the user's words Sísí marked as worth keeping */
  offer?: string;
  /** short reply options for a clarifying question (max two) */
  chips?: string[];
  /** ONE earned suggestion — only when Sísí's reply asks for it */
  action?: { kind: "step" | "walk" } | { kind: "visit"; star: Star };
  /** after a save: keep talking · back to Journey */
  after?: boolean;
};
type Keep = { mode: "moment" | "star"; text: string; starId: string | null; type: MomentType };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Fired once per open when the talk becomes meaningful. */
  onMeaningful?: () => void;
  /** The Current Star — Sísí remembers it in the conversation. */
  star?: Star | null;
  /** "See my journey" — rise to this Star's journey */
  onSeeJourney?: (star: Star) => void;
  /** Sísí's first line (e.g. the thought the user wanted to talk about) */
  opening?: string | null;
};

const STARTERS: { label: string; say: string }[] = [
  { label: "I want to talk", say: "I want to talk." },
  { label: "Help me with a Star", say: "Can you help me with one of my Stars?" },
  { label: "I’m not sure", say: "I’m not sure what I want to say." },
];

export function CompanionSheet({ open, onClose, onMeaningful, star = null, onSeeJourney, opening = null }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [keep, setKeep] = useState<Keep | null>(null);
  const [keepBusy, setKeepBusy] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  // Sísí's expression — one explicit state, changed only when it means something
  const [expr, setExpr] = useState<SisiChatExpression>("seated");
  const [scrolling, setScrolling] = useState(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();
  const sharedChars = useRef(0);
  const sharedCount = useRef(0);
  const meaningfulSent = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** the thread itself — the single source for every request (never stale React state) */
  const conv = useRef<Conversation | null>(null);
  const shownId = useRef<string | null>(null);

  /** Rebuild what's on the paper from the stored thread. */
  const showThread = (c: Conversation) => {
    shownId.current = c.id;
    setMessages(c.turns.map((t, i) => ({ id: `${c.id}-${i}`, from: t.role === "user" ? "user" : "sisi", text: t.content })));
    setDismissed(new Set());
    sharedChars.current = 0;
    sharedCount.current = 0;
    meaningfulSent.current = false;
  };

  // Opening the paper resumes the active conversation (a new one begins
  // only after a long pause, or when the person chooses to start fresh).
  useEffect(() => {
    if (open) {
      let c = activeConversation();
      // a thought the person wanted to talk about: Sísí's line joins the thread
      if (opening && c.turns[c.turns.length - 1]?.content !== opening) c = addTurn(c, "assistant", opening);
      conv.current = c;
      if (shownId.current !== c.id || opening) showThread(c);
      setDraft("");
      setKeep(null);
      // a first welcome: seated; resuming or opening from a thought: listening
      setExpr(opening || c.turns.length ? "listening" : "seated");
      loadStars().then((s) => setStars(walkingStars(s)));
      // a small picture for each Star: its latest photo Moment, if any
      loadMoments().then((ms) => {
        const t: Record<string, string> = {};
        for (const m of ms) if (m.starId && m.image && !t[m.starId]) t[m.starId] = m.image;
        setThumbs(t);
      });
    }
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, keep]);

  const hasTalked = messages.some((m) => m.from === "user");

  const startFresh = () => {
    const c = newConversation();
    conv.current = c;
    showThread(c);
    setKeep(null);
    setExpr("seated");
  };

  async function send(preset?: string) {
    const text = (preset ?? draft).trim();
    if (!text || sending) return;
    // the user's words join the thread BEFORE the request is built
    let c = addTurn(conv.current ?? activeConversation(), "user", text);
    conv.current = c;
    const payload = requestPayload(c, {
      currentStar: star?.wish ?? null,
      // numbered, so Sísí can suggest visiting one by name ([VISIT:n])
      stars: stars.map((st) => st.wish).slice(0, 8),
    });
    const userMsg: Msg = { id: `u-${Date.now()}`, from: "user", text };
    setMessages((m) => [...m, userMsg]);
    sharedCount.current += 1;
    sharedChars.current += text.length;
    if (!meaningfulSent.current && sharedCount.current >= 2 && sharedChars.current >= 40) {
      meaningfulSent.current = true;
      onMeaningful?.();
    }
    setDraft("");
    setSending(true);
    setExpr("thinking");
    const thinkingSince = Date.now();
    const sisiId = `s-${Date.now()}`;
    setMessages((m) => [...m, { id: sisiId, from: "sisi", text: "" }]);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok || !resp.body) throw new Error("chat failed");
      // Server-Sent Events: `data: {"text": "..."}` lines.
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            acc += JSON.parse(payload).text ?? "";
          } catch {
            // partial line
          }
        }
        const shown = visibleText(acc);
        setMessages((m) => m.map((x) => (x.id === sisiId ? { ...x, text: shown } : x)));
      }
      // the reply joins the thread once, with Sísí's updated understanding
      const reply = visibleText(acc);
      const meta = parseMeta(acc);
      c = addTurn(conv.current ?? c, "assistant", reply);
      c = setMeta(c, meta);
      conv.current = c;
      const stage = meta?.stage;
      // Explicit mood from the reply (never guessed from keywords):
      // a clearly supportive answer → eyes closed; otherwise listening.
      const mood: SisiChatExpression = /\[MOOD:comfort\]/i.test(acc) ? "comfort" : "listening";
      const wait = Math.max(0, MIN_THINK_MS - (Date.now() - thinkingSince));
      setTimeout(() => setExpr(mood), wait);
      // Listen first, guide second: actions come only from Sísí's own reply,
      // never on the first message (she doesn't understand yet), and never
      // more than one. A clarifying question may carry two reply chips.
      // Sísí's own stage decides: nothing is offered while she is still understanding.
      const firstTurn = c.turns.filter((t) => t.role === "user").length <= 1;
      const chipsM = /\[CHIPS:([^\]]+)\]/i.exec(acc);
      const chips = chipsM ? chipsM[1].split("|").map((x) => x.trim()).filter(Boolean).slice(0, 2) : undefined;
      const worth = !firstTurn && /\[SAVE:[a-z]+\]/i.test(acc) && actionAllowed("save", stage);
      let action: Msg["action"];
      if (!firstTurn && !worth && !chips) {
        const visit = /\[VISIT:(\d+)\]/i.exec(acc);
        const kind = /\[ACTION:(step|walk)\]/i.exec(acc)?.[1] as "step" | "walk" | undefined;
        const target = visit ? stars[Number(visit[1]) - 1] : undefined;
        if (target && actionAllowed("visit", stage)) action = { kind: "visit", star: target };
        else if (kind && actionAllowed(kind, stage)) action = { kind };
      }
      if (chips || worth || action) {
        setMessages((m) =>
          m.map((x) => (x.id === sisiId ? { ...x, chips, offer: worth ? text : undefined, action } : x)),
        );
      }
    } catch {
      // (not added to the thread: the next request retries from the user's words)
      setExpr("listening");
      setMessages((m) => m.map((x) => (x.id === sisiId ? { ...x, text: "Let’s try that again in a moment." } : x)));
    } finally {
      setSending(false);
    }
  }

  const startKeep = (mode: Keep["mode"], text: string) => {
    setExpr("listening");
    setKeep({ mode, text, starId: mode === "star" ? star?.id ?? stars[0]?.id ?? null : null, type: "something_good" });
  };

  const confirmKeep = async () => {
    if (!keep || keepBusy || !keep.text.trim()) return;
    if (keep.mode === "star" && !keep.starId) return;
    setKeepBusy(true);
    try {
      // only the chosen words — never the conversation
      await createMoment({
        source: "sisi_conversation",
        type: keep.mode === "star" ? keep.type : "general",
        text: keep.text,
        starId: keep.mode === "star" ? keep.starId : null,
      });
      const wish = stars.find((s) => s.id === keep.starId)?.wish;
      const note = keep.mode === "star" ? `Added to “${wish ?? "your Star"}”. It’s in Moments too.` : "Kept safely in Moments.";
      const t = Date.now();
      setMessages((m) => [
        ...m.map((x) => ({ ...x, offer: undefined })),
        { id: `k-${t}`, from: "saved", text: note },
        { id: `a-${t}`, from: "sisi", text: "We can keep talking, or return to our walk.", after: true },
      ]);
      if (conv.current) conv.current = addTurn(conv.current, "assistant", "We can keep talking, or return to our walk.");
      setKeep(null);
      setExpr("comfort"); // a meaningful thought, kept
    } finally {
      setKeepBusy(false);
    }
  };

  // Only the newest Sísí note carries choices.
  const lastSisi = [...messages].reverse().find((m) => m.from === "sisi");
  /** at most one primary suggestion and one subtle secondary — or chips */
  const pillsFor = (m: Msg): { chips?: Pill[]; primary?: Pill; secondary?: Pill; lock?: boolean } | null => {
    if (!lastSisi || m.id !== lastSisi.id || sending || dismissed.has(m.id)) return null;
    const hide = () => setDismissed((d) => new Set(d).add(m.id));
    if (m.chips?.length)
      return { chips: m.chips.map((c) => ({ label: c, act: () => { hide(); send(c); } })) };
    if (m.offer)
      return {
        lock: true,
        primary: { label: "Keep this in Moments", act: () => startKeep("moment", m.offer!) },
        secondary: stars.length ? { label: "Add to a Star", act: () => startKeep("star", m.offer!) } : undefined,
      };
    if (m.after) return { primary: { label: "Walk with me", act: onClose } };
    if (m.action?.kind === "step")
      return {
        primary: {
          label: "Find one small step together",
          act: () => { hide(); send("Could you help me find one small step?"); },
        },
      };
    if (m.action?.kind === "visit") {
      const target = m.action.star;
      return { primary: { label: `Visit “${target.wish}”`, act: () => onSeeJourney?.(target) } };
    }
    if (m.action?.kind === "walk") return { primary: { label: "Walk with me", act: onClose } };
    return null;
  };

  const titleId = "sisi-talk-title";
  return (
    <FocusPaper
      open={open}
      onClose={keep ? () => setKeep(null) : onClose}
      title={<h2 id={titleId} className="cs-sr">Talk with Sísí</h2>}
      titleId={titleId}
      closeLabel="Close conversation"
      headerExtra={
        hasTalked && !keep ? (
          <OverflowMenu label="Conversation options" items={[{ label: "Start a new conversation", destructive: false, onSelect: startFresh }]} />
        ) : undefined
      }
      tall
      className="companion-sheet"
      bodyRef={keep ? undefined : scrollRef}
      decoration={<SisiChatCharacter expression={expr} still={scrolling} />}
      onBodyScroll={() => {
        // hold still while the user scrolls
        setScrolling(true);
        clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => setScrolling(false), 450);
      }}
      footer={
        keep ? (
          <div className="ds-actions" style={{ marginTop: 0 }}>
            <PrimaryButton
              block
              loading={keepBusy}
              disabled={!keep.text.trim() || (keep.mode === "star" && !keep.starId)}
              onClick={confirmKeep}
            >
              {keep.mode === "star" ? "Save to my Star" : "Keep this in Moments"}
            </PrimaryButton>
            <TextAction onClick={() => setKeep(null)}>Not now</TextAction>
          </div>
        ) : (
          <form
            className="cs-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                // typing: Sísí turns to listen
                if (e.target.value && !sending && expr !== "listening") setExpr("listening");
              }}
              placeholder="Share anything…"
              aria-label="Share anything"
              disabled={sending}
              className="ds-field cs-input"
              autoComplete="off"
            />
            <IconButton type="submit" label="Send" className="cs-send" disabled={!draft.trim() || sending}>
              <IconSend size={18} />
            </IconButton>
          </form>
        )
      }
    >
      <p className="cs-sr" role="status" aria-live="polite">
        {sending ? "Sísí is thinking…" : ""}
      </p>

      {keep ? (
        /* ── keep, with an editable preview ── */
        <div className="cs-keep" role="group" aria-label={keep.mode === "star" ? "Add to a Star" : "Keep this in Moments"}>
          <p className="t-card-title cs-keep-title">{keep.mode === "star" ? "Which Star does this belong to?" : "Keep this in Moments"}</p>
          <textarea
            className="ds-field"
            rows={3}
            maxLength={240}
            value={keep.text}
            aria-label="What to keep"
            onChange={(e) => setKeep({ ...keep, text: e.target.value })}
          />

          {keep.mode === "moment" ? (
            <p className="ds-helper cs-keep-source">
              <BubbleIcon /> From a conversation with Sísí
            </p>
          ) : (
            <>
              <div className="cs-star-list" role="radiogroup" aria-label="Which Star">
                {stars.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={keep.starId === s.id}
                    className="ds-star-row cs-star-row"
                    onClick={() => setKeep({ ...keep, starId: s.id })}
                  >
                    <span className="cs-star-thumb">
                      {thumbs[s.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[s.id]} alt="" />
                      ) : (
                        <StarGlyph size={18} />
                      )}
                    </span>
                    <span className="ds-star-row-main"><span className="ds-star-row-title">{s.wish}</span></span>
                    <span className={`cs-radio${keep.starId === s.id ? " is-on" : ""}`} aria-hidden />
                  </button>
                ))}
              </div>
              <p className="ds-label" style={{ margin: "8px 0 0" }}>What kind of note is this?</p>
              <div className="ds-chip-row">
                {([
                  ["something_good", "Something good"],
                  ["small_step", "A small step"],
                ] as const).map(([t, label]) => (
                  <FilterChip key={t} selected={keep.type === t} onClick={() => setKeep({ ...keep, type: t })}>
                    {label}
                  </FilterChip>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="cs-thread">
          {/* 1 · Sísí welcomes you */}
          <div className="cs-greet">
            <p className="t-screen-title cs-greet-h">I’m here.</p>
            {opening ? (
              <p className="t-dialogue cs-sisi" style={{ textAlign: "left" }}>{opening}</p>
            ) : (
              <p className="t-dialogue cs-greet-q">What’s on your mind?</p>
            )}
          </div>
          {!hasTalked && (
            <div className="ds-chip-row cs-chips" aria-label="Ways to begin">
              {STARTERS.map((st) => (
                <ReplyChip key={st.label} onClick={() => send(st.say)}>
                  {st.label}
                </ReplyChip>
              ))}
            </div>
          )}

          {messages.map((m, i) => {
            if (m.from === "saved")
              return (
                <p key={m.id} className="t-meta cs-saved">
                  <CheckIcon /> {m.text}
                </p>
              );
            if (m.from === "user")
              return (
                <p key={m.id} className="t-body cs-user">
                  {m.text}
                </p>
              );
            const p = pillsFor(m);
            return (
              <div key={m.id} className="cs-turn">
                <p className="t-dialogue cs-sisi">
                  {m.text || (sending && i === messages.length - 1 ? "…" : "")}
                </p>
                {p?.chips && (
                  <div className="ds-chip-row cs-chips" aria-label="Quick replies">
                    {p.chips.map((c) => (
                      <ReplyChip key={c.label} onClick={c.act}>
                        {c.label}
                      </ReplyChip>
                    ))}
                  </div>
                )}
                {p?.primary && (
                  <div className="cs-suggest">
                    <PrimaryButton onClick={p.primary.act}>{p.primary.label}</PrimaryButton>
                    {p.secondary && <TextAction onClick={p.secondary.act}>{p.secondary.label}</TextAction>}
                    {p.lock && (
                      <p className="t-helper cs-lock">
                        <LockIcon /> Nothing is saved unless you choose.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        /* the conversation paper leaves room above for Sísí resting on it */
        .companion-sheet.ds-focus { max-height: min(78dvh, calc(100dvh - var(--safe-top) - 150px - var(--ds-kb, 0px))) !important; }
        .companion-sheet.ds-focus--tall { height: min(78dvh, calc(100dvh - var(--safe-top) - 150px - var(--ds-kb, 0px))); }
        .companion-sheet .ds-focus-head { min-height: 44px; padding-top: 4px; }
        .companion-sheet .ds-focus-body { padding-top: 4px; }
        .cs-sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        .cs-thread { display: flex; flex-direction: column; gap: var(--space-3); }
        .cs-greet { text-align: center; padding: 0 0 4px; }
        .cs-greet-h { margin: 0 0 6px; }
        .cs-greet-q { margin: 0; }
        .cs-greet .cs-sisi { margin-top: 8px; }
        /* Sísí speaks in the editorial voice, straight onto the paper */
        .cs-sisi { margin: 0; align-self: flex-start; max-width: 92%; color: var(--sisi-ink); white-space: pre-wrap; }
        .cs-turn { display: flex; flex-direction: column; gap: var(--space-3); }
        /* the person's words: a soft blue note on the right */
        .cs-user {
          margin: 0; align-self: flex-end; max-width: 82%; padding: 10px 14px; border-radius: 14px 14px 4px 14px;
          background: var(--blue-20); color: var(--sisi-ink); white-space: pre-wrap;
        }
        .cs-chips { padding: 0; }
        .cs-suggest { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
        .cs-lock { flex-basis: 100%; display: flex; align-items: center; gap: 6px; margin: 0; color: var(--ink-60); }
        .cs-lock svg { width: 12px; height: 12px; }
        .cs-saved { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 2px 0; color: var(--ink-80); }
        .cs-saved svg { width: 16px; height: 16px; flex: 0 0 auto; }
        .cs-input-row { display: flex; align-items: center; gap: var(--space-2); }
        .cs-input { flex: 1; min-width: 0; border-radius: 999px; padding: 0 18px; }
        .cs-send { background: var(--sisi-ink); color: var(--sisi-paper); }
        .cs-send:hover:not(:disabled) { background: var(--ink-80); }
        .cs-keep { display: flex; flex-direction: column; gap: var(--space-3); }
        .cs-keep-title { margin: 0; text-align: center; }
        .cs-keep-source { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0; }
        .cs-keep-source svg { width: 16px; height: 16px; }
        .cs-star-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .cs-star-row[aria-checked="true"] { border-color: var(--sisi-ink); }
        .cs-star-thumb {
          flex: 0 0 52px; width: 52px; height: 38px; border-radius: 4px; overflow: hidden; background: var(--sisi-ink);
          display: flex; align-items: center; justify-content: center;
        }
        .cs-star-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .cs-radio { flex: 0 0 18px; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--ink-35); position: relative; }
        .cs-radio.is-on { border-color: var(--sisi-ink); }
        .cs-radio.is-on::after { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: var(--sisi-ink); }
      `}</style>
    </FocusPaper>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function BubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.2A7.5 7.5 0 1 1 20 12z" />
    </svg>
  );
}
