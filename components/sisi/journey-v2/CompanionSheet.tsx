"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Star } from "@/lib/myStars";
import { loadStars, walkingStars } from "@/lib/myStars";
import { createMoment, loadMoments, type MomentType } from "@/lib/momentStore";
import { tornEdge } from "@/lib/tornEdge";
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
 */

const PAPER_EDGE = tornEdge(51, 30, 0.9);
const NOTE_EDGE = tornEdge(61, 14, 2.4);
/** A reply is prepared with a thoughtful look, held at least this long. */
const MIN_THINK_MS = 700;
/** Invisible markers Sísí may add (see app/api/chat): stripped from the text. */
const MARKERS = /\[(?:SAVE|MOOD|ACTION|VISIT):[a-z0-9]+\]|\[CHIPS:[^\]]*\]/gi;
/** a marker still arriving mid-stream ("[CHIPS:I don…") is never shown */
const PARTIAL = /\[[A-Z]{0,6}(?::[^\]]*)?$/;

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

  // A fresh, private conversation each time.
  useEffect(() => {
    if (open) {
      setMessages([]);
      setDraft("");
      setKeep(null);
      // a first welcome: seated; opening from a thought: already listening
      setExpr(opening ? "listening" : "seated");
      setDismissed(new Set());
      sharedChars.current = 0;
      sharedCount.current = 0;
      meaningfulSent.current = false;
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

  async function send(preset?: string) {
    const text = (preset ?? draft).trim();
    if (!text || sending) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, from: "user", text };
    const history = [...messages, userMsg]
      .filter((x) => x.from !== "saved" && !x.after)
      .map((x) => ({ role: x.from === "user" ? "user" : "assistant", content: x.text }));
    if (opening) history.unshift({ role: "assistant", content: opening });
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
        body: JSON.stringify({
          messages: history,
          currentStar: star?.wish ?? null,
          // numbered, so Sísí can suggest visiting one by name ([VISIT:n])
          stars: stars.map((st) => st.wish).slice(0, 8),
        }),
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
        const shown = acc.replace(MARKERS, "").replace(PARTIAL, "").trim();
        setMessages((m) => m.map((x) => (x.id === sisiId ? { ...x, text: shown } : x)));
      }
      // Explicit mood from the reply (never guessed from keywords):
      // a clearly supportive answer → eyes closed; otherwise listening.
      const mood: SisiChatExpression = /\[MOOD:comfort\]/i.test(acc) ? "comfort" : "listening";
      const wait = Math.max(0, MIN_THINK_MS - (Date.now() - thinkingSince));
      setTimeout(() => setExpr(mood), wait);
      // Listen first, guide second: actions come only from Sísí's own reply,
      // never on the first message (she doesn't understand yet), and never
      // more than one. A clarifying question may carry two reply chips.
      const firstTurn = sharedCount.current <= 1;
      const chipsM = /\[CHIPS:([^\]]+)\]/i.exec(acc);
      const chips = chipsM ? chipsM[1].split("|").map((c) => c.trim()).filter(Boolean).slice(0, 2) : undefined;
      const worth = !firstTurn && /\[SAVE:[a-z]+\]/i.test(acc);
      let action: Msg["action"];
      if (!firstTurn && !worth && !chips) {
        const visit = /\[VISIT:(\d+)\]/i.exec(acc);
        const kind = /\[ACTION:(step|walk)\]/i.exec(acc)?.[1] as "step" | "walk" | undefined;
        const target = visit ? stars[Number(visit[1]) - 1] : undefined;
        if (target) action = { kind: "visit", star: target };
        else if (kind) action = { kind };
      }
      if (chips || worth || action) {
        setMessages((m) =>
          m.map((x) => (x.id === sisiId ? { ...x, chips, offer: worth ? text : undefined, action } : x)),
        );
      }
    } catch {
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* The world stays visible; the tabs below stay usable. */}
          <motion.button
            type="button"
            aria-label="Close conversation"
            onClick={onClose}
            className="companion-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          <motion.aside
            role="dialog"
            aria-label="Talk with Sísí"
            className="companion-sheet"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "108%" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Sísí rests on the paper, paws over its top edge. */}
            <SisiChatCharacter expression={expr} still={scrolling} />
            <div className="paper paper-bg" aria-hidden />
            <p className="sr-only" role="status" aria-live="polite">
              {sending ? "Sísí is thinking…" : ""}
            </p>

            {keep ? (
              /* ── 4a / 4b: keep, with an editable preview ── */
              <div className="keep" role="group" aria-label={keep.mode === "star" ? "Add to a Star" : "Save as a Moment"}>
                <div className="keep-head">
                  <p className="keep-title">{keep.mode === "star" ? "Which Star does this belong to?" : "Save as a Moment"}</p>
                  <button type="button" className="icon-btn" aria-label="Cancel" onClick={() => setKeep(null)}>
                    <CloseIcon />
                  </button>
                </div>
                <div className="quote">
                  <span className="quote-mark" aria-hidden>“</span>
                  <textarea
                    rows={3}
                    maxLength={240}
                    value={keep.text}
                    aria-label="What to keep"
                    onChange={(e) => setKeep({ ...keep, text: e.target.value })}
                  />
                </div>

                {keep.mode === "moment" ? (
                  <p className="keep-source">
                    <BubbleIcon /> A conversation with Sísí
                  </p>
                ) : (
                  <>
                    <div className="star-list" role="radiogroup" aria-label="Which Star">
                      {stars.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={keep.starId === s.id}
                          className="star-row"
                          onClick={() => setKeep({ ...keep, starId: s.id })}
                        >
                          <span className="star-thumb">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumbs[s.id] ?? "/assets/sisi-star-mark-painted-512.png"} alt="" className={thumbs[s.id] ? "" : "is-mark"} />
                          </span>
                          <span className="star-wish">{s.wish}</span>
                          <span className={`radio${keep.starId === s.id ? " is-on" : ""}`} aria-hidden />
                        </button>
                      ))}
                    </div>
                    <p className="keep-q">What kind of note is this?</p>
                    <div className="seg">
                      {([
                        ["something_good", "Something good"],
                        ["small_step", "A small step"],
                      ] as const).map(([t, label]) => (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={keep.type === t}
                          className={`seg-btn${keep.type === t ? " is-on" : ""}`}
                          onClick={() => setKeep({ ...keep, type: t })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  className="primary"
                  disabled={keepBusy || !keep.text.trim() || (keep.mode === "star" && !keep.starId)}
                  onClick={confirmKeep}
                >
                  {keep.mode === "star" ? "Save to my Star" : "Save Moment"}
                </button>
                <button type="button" className="pill pill--quiet" onClick={() => setKeep(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div
                  className="scroll"
                  ref={scrollRef}
                  onScroll={() => {
                    // hold still while the user scrolls
                    setScrolling(true);
                    clearTimeout(scrollTimer.current);
                    scrollTimer.current = setTimeout(() => setScrolling(false), 450);
                  }}
                >
                  {/* 1 · Sísí welcomes you */}
                  <div className="greet">
                    <p className="greet-h">I’m here.</p>
                    {opening ? (
                      <p className="note note-sisi" style={{ clipPath: NOTE_EDGE }}>{opening}</p>
                    ) : (
                      <p className="greet-q">What’s on your mind?</p>
                    )}
                  </div>
                  {!hasTalked && (
                    <div className="chips" aria-label="Ways to begin">
                      {STARTERS.map((s) => (
                        <button key={s.label} type="button" className="chip" onClick={() => send(s.say)}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {messages.map((m, i) => {
                    if (m.from === "saved")
                      return (
                        <p key={m.id} className="saved-chip">
                          <CheckIcon /> {m.text}
                        </p>
                      );
                    if (m.from === "user")
                      return (
                        <p key={m.id} className="note note-user">
                          {m.text}
                        </p>
                      );
                    const p = pillsFor(m);
                    const isLast = lastSisi?.id === m.id;
                    return (
                      <div key={m.id} className="turn">
                        <div className="note note-sisi" style={{ clipPath: NOTE_EDGE }}>
                          {m.text || (sending && i === messages.length - 1 ? "…" : "")}
                        </div>
                        {isLast && m.text && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="coral" src="/V2/moments/coral-star-stamp.png" alt="" aria-hidden />
                        )}
                        {p?.chips && (
                          <div className="chips" aria-label="Quick replies">
                            {p.chips.map((c) => (
                              <button key={c.label} type="button" className="chip" onClick={c.act}>
                                {c.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {p?.primary && (
                          <div className="suggest">
                            <button type="button" className="suggest-btn" onClick={p.primary.act}>
                              {p.primary.label}
                            </button>
                            {p.secondary && (
                              <button type="button" className="suggest-link" onClick={p.secondary.act}>
                                {p.secondary.label}
                              </button>
                            )}
                            {p.lock && (
                              <p className="lock">
                                <LockIcon /> Nothing is saved unless you choose.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <form
                  className="input-row"
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
                    className="input"
                  />
                  <button type="submit" disabled={!draft.trim() || sending} aria-label="Send" className="send-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5M6 11l6-6 6 6" />
                    </svg>
                  </button>
                </form>
              </>
            )}
          </motion.aside>

          <style jsx global>{`
            .companion-backdrop {
              position: fixed; left: 0; right: 0; top: 0;
              /* the tabs stay reachable */
              bottom: var(--nav-total, 84px);
              background: rgba(20, 28, 52, 0.12); z-index: 30; border: 0; padding: 0;
            }
            .companion-sheet {
              position: fixed; z-index: 31;
              left: max(10px, var(--safe-left, 0px)); right: max(10px, var(--safe-right, 0px));
              top: max(24%, calc(var(--safe-top, 0px) + 150px));
              bottom: calc(var(--nav-total, 84px) + 6px);
              display: flex; flex-direction: column;
              filter: drop-shadow(0 10px 26px rgba(0, 0, 0, 0.25));
            }
            @media (min-width: 500px) {
              .companion-sheet { left: 50%; right: auto; width: 410px; margin-left: -205px; }
            }
            .companion-sheet .paper { position: absolute; inset: 0; z-index: 1; clip-path: ${PAPER_EDGE}; }
            .companion-sheet .sr-only {
              position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
            }
            .companion-sheet .scroll, .companion-sheet .input-row, .companion-sheet .keep { position: relative; z-index: 2; }

            .companion-sheet .scroll {
              flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior-y: contain;
              padding: 44px 18px 10px; display: flex; flex-direction: column; gap: 12px;
            }
            .companion-sheet .greet { text-align: center; padding: 6px 0 4px; }
            .companion-sheet .greet-h { margin: 0 0 6px; font-family: var(--font-fraunces), Georgia, serif; font-size: 27px; color: #1d2744; }
            .companion-sheet .greet-q { margin: 0; font-family: var(--font-fraunces), Georgia, serif; font-size: 18px; color: #2b2f45; }
            .companion-sheet .greet .note-sisi { margin: 8px auto 0; text-align: left; }

            .companion-sheet .note { margin: 0; padding: 12px 14px; font-size: 16px; line-height: 1.42; }
            .companion-sheet .note-user {
              align-self: flex-end; max-width: 82%; border-radius: 3px;
              background: rgba(143, 172, 224, 0.3); color: #243157;
              font-family: var(--font-eb-garamond), Georgia, serif;
            }
            .companion-sheet .turn { position: relative; display: flex; flex-direction: column; gap: 10px; }
            .companion-sheet .note-sisi {
              align-self: flex-start; max-width: 88%; background: #efe5d0; color: #2b2f45;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16.5px;
              box-shadow: 0 2px 6px rgba(43, 47, 69, 0.08);
            }
            .companion-sheet .coral { position: absolute; top: 44px; right: 4px; width: 22px; height: 22px; opacity: 0.9; pointer-events: none; }

            .companion-sheet .pills { display: flex; flex-direction: column; gap: 8px; padding: 2px 8px; }
            .companion-sheet .pill {
              min-height: 44px; border-radius: 999px; cursor: pointer;
              border: 1px solid rgba(43, 47, 69, 0.1); background: #f8f2e4; color: #2b2f45;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px;
              box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 2px 5px rgba(43, 47, 69, 0.08);
            }
            .companion-sheet .pill:hover { background: #fbf7ee; }
            .companion-sheet .pill--quiet { color: rgba(43, 47, 69, 0.7); }
            /* compact reply chips (wrap), never a stack of full-width buttons */
            .companion-sheet .chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 2px; }
            .companion-sheet .chip {
              min-height: 38px; padding: 0 14px; border-radius: 999px; cursor: pointer;
              border: 1px solid rgba(61, 116, 216, 0.3); background: #f8f2e4; color: #2b4f9e;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px;
            }
            .companion-sheet .suggest { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; padding: 0 2px; }
            .companion-sheet .suggest-btn {
              min-height: 42px; padding: 0 18px; border-radius: 999px; cursor: pointer; border: 0;
              background: #3d74d8; color: #f7f2e3; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15.5px;
              max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .companion-sheet .suggest-link {
              min-height: 42px; padding: 0 4px; border: 0; background: transparent; cursor: pointer;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px; color: #3d74d8;
            }
            .companion-sheet .suggest .lock { flex-basis: 100%; justify-content: flex-start; }
            .companion-sheet .lock {
              display: flex; align-items: center; justify-content: center; gap: 6px; margin: 2px 0 0;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 13px; color: rgba(43, 47, 69, 0.55);
            }
            .companion-sheet .lock svg { width: 12px; height: 12px; }
            .companion-sheet .saved-chip {
              display: flex; align-items: center; justify-content: center; gap: 8px; margin: 2px 0;
              padding: 10px 12px; border-radius: 3px; background: rgba(143, 163, 140, 0.22); color: #3d4d3b;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px;
            }
            .companion-sheet .saved-chip svg { width: 16px; height: 16px; flex: 0 0 auto; }

            .companion-sheet .input-row { display: flex; align-items: center; gap: 8px; padding: 8px 14px 16px; }
            .companion-sheet .input {
              flex: 1; min-width: 0; height: 46px; border-radius: 999px; padding: 0 18px; outline: none;
              border: 1px solid rgba(43, 47, 69, 0.14); background: #fffdf7; color: #2b2f45;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px;
            }
            .companion-sheet .input::placeholder { color: rgba(43, 47, 69, 0.45); font-style: italic; }
            .companion-sheet .send-btn {
              flex: 0 0 44px; width: 44px; height: 44px; border-radius: 50%; border: 0; cursor: pointer;
              background: #9aa0ad; color: #fff; display: inline-flex; align-items: center; justify-content: center;
            }
            .companion-sheet .send-btn:enabled { background: #3d74d8; }
            .companion-sheet .send-btn:disabled { opacity: 0.6; cursor: default; }
            .companion-sheet .send-btn svg { width: 18px; height: 18px; }

            /* keep panels */
            .companion-sheet .keep { flex: 1; min-height: 0; overflow-y: auto; padding: 40px 18px 16px; display: flex; flex-direction: column; gap: 10px; }
            .companion-sheet .keep-head { display: flex; align-items: center; justify-content: center; position: relative; min-height: 44px; }
            .companion-sheet .keep-title { margin: 0; padding: 0 40px; text-align: center; font-family: var(--font-fraunces), Georgia, serif; font-size: 19px; color: #1d2744; }
            .companion-sheet .icon-btn {
              position: absolute; right: -6px; top: 0; width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer;
              color: rgba(43, 47, 69, 0.6); display: inline-flex; align-items: center; justify-content: center;
            }
            .companion-sheet .icon-btn svg { width: 18px; height: 18px; }
            .companion-sheet .quote { position: relative; background: #efe5d0; padding: 12px 14px 10px 26px; box-shadow: 0 2px 6px rgba(43, 47, 69, 0.08); }
            .companion-sheet .quote-mark { position: absolute; left: 10px; top: 6px; font-family: var(--font-fraunces), Georgia, serif; font-size: 22px; color: rgba(43, 47, 69, 0.45); }
            .companion-sheet .quote textarea {
              width: 100%; resize: none; border: 0; background: transparent; outline: none; color: #2b2f45;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 16px; line-height: 1.42;
            }
            .companion-sheet .keep-source { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 4px 0 6px; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 14.5px; color: rgba(43, 47, 69, 0.7); }
            .companion-sheet .keep-source svg { width: 16px; height: 16px; }
            .companion-sheet .star-list { display: flex; flex-direction: column; gap: 6px; }
            .companion-sheet .star-row {
              display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 4px 6px; border: 0; border-radius: 6px;
              background: transparent; cursor: pointer; text-align: left;
            }
            .companion-sheet .star-row:hover { background: rgba(255, 255, 255, 0.4); }
            .companion-sheet .star-thumb { flex: 0 0 60px; width: 60px; height: 42px; border-radius: 3px; overflow: hidden; background: #0b1b38; display: flex; align-items: center; justify-content: center; }
            .companion-sheet .star-thumb img { width: 100%; height: 100%; object-fit: cover; }
            .companion-sheet .star-thumb img.is-mark { width: 26px; height: 26px; object-fit: contain; }
            .companion-sheet .star-wish { flex: 1; min-width: 0; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15.5px; color: #2b2f45; }
            .companion-sheet .radio { flex: 0 0 18px; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(61, 116, 216, 0.6); position: relative; }
            .companion-sheet .radio.is-on::after { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: #3d74d8; }
            .companion-sheet .keep-q { margin: 6px 0 0; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 14.5px; color: rgba(43, 47, 69, 0.7); }
            .companion-sheet .seg { display: flex; gap: 8px; }
            .companion-sheet .seg-btn {
              flex: 1; min-height: 40px; border-radius: 999px; cursor: pointer; border: 1px solid rgba(43, 47, 69, 0.14);
              background: #f8f2e4; color: #2b2f45; font-family: var(--font-eb-garamond), Georgia, serif; font-size: 15px;
            }
            .companion-sheet .seg-btn.is-on { background: #3d74d8; border-color: #3d74d8; color: #f7f2e3; }
            .companion-sheet .primary {
              min-height: 48px; margin-top: 6px; border: 0; border-radius: 999px; cursor: pointer; background: #3d74d8; color: #f7f2e3;
              font-family: var(--font-eb-garamond), Georgia, serif; font-size: 17px;
            }
            .companion-sheet .primary:disabled { opacity: 0.45; cursor: default; }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
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
