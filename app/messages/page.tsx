"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatBubble, ChoiceButton } from "@/components/sisi/ChatBubble";
import { GuestLoginNudge } from "@/components/sisi/GuestLoginNudge";
import { BottomNav } from "@/components/sisi/BottomNav";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const CHIPS = [
  "I felt grateful",
  "Something surprised me",
  "something is on my mind",
];

type Mode = "opening" | "chatting";

type Role = "user" | "sisi";

type Message = {
  id: string;
  from: Role;
  text: string;
  time: string;
  /** Sísí가 [SAVE:reason]을 붙였을 때만 채워짐 */
  saveReason?: SaveReason;
};

type SaveReason = "special" | "shift" | "insight" | "intention";

type Step =
  | "chatting"
  | "saveOffered"
  | "saving"
  | "savedReveal"
  | "continue";

const OPENING_QUESTION = "What stayed with you today?";

/** SAVE marker 파싱 — Sísí 응답 마지막에 붙는 [SAVE:reason]을 뽑아냄 */
function parseSaveMarker(text: string): {
  clean: string;
  reason: SaveReason | null;
} {
  const match = text.match(/\[SAVE:(special|shift|insight|intention)\]/i);
  if (!match) return { clean: text.trim(), reason: null };
  return {
    clean: text.replace(match[0], "").trim(),
    reason: match[1].toLowerCase() as SaveReason,
  };
}

/** 저장 라벨 — save reason별로 다른 postcard 헤딩 */
const SAVE_LABELS: Record<SaveReason, string> = {
  special: "a special moment",
  shift: "a shift",
  insight: "an insight",
  intention: "an intention",
};

/** localStorage에 chat memory 저장 (Supabase 마이그레이션 전 임시) */
function saveChatMemory(entry: {
  userMessage: string;
  sisiResponse: string;
  reason: SaveReason;
}) {
  try {
    const key = "sisi:chatMemories";
    const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
    existing.unshift({
      id: crypto.randomUUID(),
      ...entry,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (err) {
    console.error("saveChatMemory failed:", err);
  }
}

function useClientTime(): string {
  const [time, setTime] = useState("6:23 PM");
  useEffect(() => {
    setTime(currentTime());
  }, []);
  return time;
}

// Guest nudge — 게스트 메시지 5개 이상 & nudge 아직 안 봤으면 자동 open
const GUEST_MSG_COUNT_KEY = "sisi:guest-msg-count";
const GUEST_NUDGE_SEEN_KEY = "sisi:guest-nudge-seen";
const GUEST_NUDGE_THRESHOLD = 5;

export default function MessagesPage() {
  const [mode, setMode] = useState<Mode>("opening");
  const [step, setStep] = useState<Step>("chatting");
  const [draftInput, setDraftInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  // Guest login nudge
  const [showNudge, setShowNudge] = useState(false);
  // Nav 자동 hide — input focus 감지 (키보드가 뜨기 전에 미리 슬라이드 다운)
  const [inputFocused, setInputFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const time = useClientTime();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, step]);

  function enterChatMode() {
    if (mode !== "opening") return;
    setMode("chatting");
  }

  function handleChipClick(chip: string) {
    setDraftInput(chip);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function sendReply() {
    const input = draftInput.trim();
    if (!input || streaming) return;
    if (mode === "opening") enterChatMode();

    // Guest nudge — 로그인 안 한 유저면 메시지 카운터 증가 + threshold 넘으면 nudge open.
    // Nudge는 세션당 한 번만 (자동 open). 사용자가 "maybe later" 후엔 bell로만 접근.
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const count = parseInt(
          localStorage.getItem(GUEST_MSG_COUNT_KEY) ?? "0",
          10,
        ) + 1;
        localStorage.setItem(GUEST_MSG_COUNT_KEY, String(count));

        const seen = localStorage.getItem(GUEST_NUDGE_SEEN_KEY) === "true";
        if (count >= GUEST_NUDGE_THRESHOLD && !seen) {
          // 메시지 몇 개 주고받은 뒤에 등장 (덜 갑작스러움)
          setTimeout(() => setShowNudge(true), 2400);
        }
      }
    } catch {
      // Supabase 실패해도 대화는 계속 진행
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      from: "user",
      text: input,
      time,
    };

    // 스트리밍 대기용 빈 sisi 메시지
    const sisiMsg: Message = {
      id: crypto.randomUUID(),
      from: "sisi",
      text: "",
      time,
    };

    setMessages((prev) => [...prev, userMsg, sisiMsg]);
    setDraftInput("");
    setStreaming(true);
    setStep("chatting");

    // 대화 히스토리 만들기 (Claude API 포맷)
    const history = [...messages, userMsg].map((m) => ({
      role: m.from === "sisi" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`chat api ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              // 스트리밍 중엔 marker 살아있어도 화면엔 그냥 raw 텍스트 — 끝나면 정리
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.from === "sisi") {
                  next[next.length - 1] = {
                    ...last,
                    text: parseSaveMarker(accumulated).clean,
                  };
                }
                return next;
              });
            }
          } catch {
            // parse 실패는 skip
          }
        }
      }

      // 스트림 종료 — 최종 SAVE marker 파싱
      const { clean, reason } = parseSaveMarker(accumulated);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.from === "sisi") {
          next[next.length - 1] = {
            ...last,
            text: clean,
            saveReason: reason ?? undefined,
          };
        }
        return next;
      });

      if (reason) setStep("saveOffered");
    } catch (err) {
      console.error("sendReply error:", err);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.from === "sisi" && !last.text) {
          next[next.length - 1] = {
            ...last,
            text: "잠깐 연결이 끊겼어. 다시 말해줄래?",
          };
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  function chooseSave() {
    const lastSisi = [...messages].reverse().find((m) => m.from === "sisi");
    const lastUser = [...messages].reverse().find((m) => m.from === "user");
    if (!lastSisi?.saveReason || !lastUser) return;

    saveChatMemory({
      userMessage: lastUser.text,
      sisiResponse: lastSisi.text,
      reason: lastSisi.saveReason,
    });

    setSavedLabel(SAVE_LABELS[lastSisi.saveReason]);
    setStep("saving");
    setTimeout(() => setStep("savedReveal"), 500);
    setTimeout(() => {
      setStep("continue");
    }, 3200);
  }

  function chooseDontSave() {
    setStep("chatting");
  }

  function resetChat() {
    setMode("opening");
    setStep("chatting");
    setMessages([]);
    setSavedLabel(null);
    setDraftInput("");
  }

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-[#F5F4EC]">
      {/* 배경 2개 crossfade — fixed inset-0으로 뷰포트에 딱 붙여둠.
          object-bottom으로 이미지의 산/풀 (아래쪽) 이 항상 화면 아래에 위치.
          키보드가 열리면 이미지 하단은 키보드 뒤로 가리지만 (fixed는 layout viewport 기준),
          유저는 화면 중앙의 fox+mountains를 계속 봄. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ opacity: mode === "opening" ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 overflow-hidden"
        >
          {/* 정적 scale 1.35 (여우 얼굴 프레이밍 유지) — 애니메이션 없이 */}
          <div
            className="absolute inset-0"
            style={{
              transformOrigin: "center top",
              transform: "scale(1.35)",
            }}
          >
            <Image
              src="/journey/ChatScreen.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-bottom"
            />
          </div>
        </motion.div>
        <motion.div
          animate={{ opacity: mode === "chatting" ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src="/journey/ChatScreen2.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-bottom"
          />
        </motion.div>
      </div>

      <div className="relative z-10 flex h-svh flex-col">
        {/* TOP — Messages tab title (다른 탭들과 통일. X 닫기 대신 nav로 이동). */}
        <header className="shrink-0 pt-[52px] px-[24px]">
          <h1 className="font-sentient text-[22px] text-journey-navy/95">
            Messages
          </h1>
        </header>

        {/* MIDDLE — content */}
        <div className="flex-1 relative min-h-0">
          {/* Opening view */}
          <AnimatePresence>
            {mode === "opening" && (
              <motion.div
                key="opening-card"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex flex-col px-[24px] pt-[40px]"
              >
                <div className="mx-auto rounded-[20px] bg-white/35 backdrop-blur-md border border-white/40 px-[28px] py-[28px] shadow-sm max-w-[300px]">
                  <p className="font-sentient text-[24px] leading-[1.2] text-center text-journey-navy">
                    What stayed with
                    <br />
                    you today?
                  </p>
                </div>
                <div className="flex-1" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat view */}
          {mode === "chatting" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              ref={scrollRef}
              className="absolute inset-0 overflow-y-auto px-[24px] pt-[24px] pb-[12px] flex flex-col gap-[24px]"
            >
              {messages.map((msg, i) => {
                const isLastSisi =
                  msg.from === "sisi" && i === messages.length - 1;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <ChatBubble
                      from={msg.from}
                      text={
                        msg.from === "sisi" && !msg.text && streaming && isLastSisi
                          ? (
                              <TypingDots />
                            )
                          : msg.text
                      }
                      time={msg.time}
                    />
                  </motion.div>
                );
              })}

              {step === "saveOffered" && !streaming && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="flex flex-col items-end gap-2"
                >
                  <ChoiceButton onClick={chooseSave}>
                    Yes, save this
                  </ChoiceButton>
                  <ChoiceButton variant="outline" onClick={chooseDontSave}>
                    Not this one
                  </ChoiceButton>
                </motion.div>
              )}

              {(step === "savedReveal" || step === "continue") && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center gap-4 my-6"
                >
                  <div className="relative w-40 h-40">
                    <Image
                      src="/journey/Sparkles.png"
                      alt=""
                      fill
                      className="object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-24 h-24">
                        <Image
                          src="/journey/Star.png"
                          alt="star"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="font-sentient text-[22px] text-journey-navy">
                    {savedLabel || "a moment"}
                  </p>
                  <p className="font-sentient text-[15px] text-journey-navy/80">
                    kept as a memory
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        {/* BOTTOM — input pill. pb는 nav 공간(85px = 30+50+여백) + 자체 여유.
             Nav가 아래에 fixed로 위치. */}
        <footer className="shrink-0 px-[24px] pt-[16px] pb-[100px]">
          <AnimatePresence>
            {mode === "opening" && (
              <motion.div
                key="chips"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-3 gap-[6px] mb-[14px]"
              >
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleChipClick(chip)}
                    className="font-sentient text-[14px] text-[#5380C4] rounded-[10px] border border-[#5380C4] bg-white/70 backdrop-blur-sm h-[63px] px-3 leading-tight hover:bg-white transition flex items-center justify-center text-center"
                  >
                    {chip}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {step === "continue" ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col gap-3"
            >
              <Link
                href="/journey"
                className="font-sentient block w-full text-center rounded-[30px] bg-journey-purple/70 backdrop-blur-md border-2 border-white text-journey-navy text-[18px] h-[60px] flex items-center justify-center hover:bg-journey-purple transition"
              >
                Continue Walking
              </Link>
              <button
                onClick={() => setStep("chatting")}
                className="font-sentient block w-full text-center rounded-[30px] bg-white/60 backdrop-blur-md border-2 border-white text-journey-navy text-[18px] h-[60px] flex items-center justify-center hover:bg-white transition"
              >
                Keep talking
              </button>
              <button
                onClick={resetChat}
                className="font-sentient text-[13px] text-journey-navy/60 mt-1"
              >
                Start a new conversation
              </button>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 h-[56px] rounded-[28px] bg-white/60 backdrop-blur-md border-2 border-white px-5 shadow-sm">
              <input
                ref={inputRef}
                type="text"
                value={draftInput}
                onChange={(e) => setDraftInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={streaming}
                placeholder={streaming ? "sísí is thinking..." : "Write here..."}
                className="font-sentient flex-1 bg-transparent text-[16px] text-journey-navy placeholder:text-journey-navy/40 outline-none disabled:opacity-50"
              />
              <button
                onClick={sendReply}
                disabled={!draftInput.trim() || streaming}
                aria-label="send"
                className="relative z-10 shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white text-journey-navy shadow-md ring-1 ring-black/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={!draftInput.trim() || streaming ? "opacity-50" : ""}
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          )}
        </footer>
      </div>

      {/* BottomNav — input focus 시 fade out + slide down (키보드 뜨기 전에 미리).
          다른 탭들과 consistency 유지. blur되면 다시 slide up. */}
      <motion.div
        animate={{
          y: inputFocused ? 90 : 0,
          opacity: inputFocused ? 0 : 1,
        }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: inputFocused ? "none" : "auto" }}
      >
        <BottomNav theme="light" />
      </motion.div>

      {/* Guest login nudge — 5개 메시지 후 자동 open */}
      <GuestLoginNudge
        open={showNudge}
        onClose={() => {
          setShowNudge(false);
          localStorage.setItem(GUEST_NUDGE_SEEN_KEY, "true");
        }}
      />
    </main>
  );
}

/** Typing indicator — Sísí가 생각하는 중 dots */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
          className="inline-block h-[6px] w-[6px] rounded-full bg-journey-navy/70"
        />
      ))}
    </span>
  );
}

function currentTime(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
