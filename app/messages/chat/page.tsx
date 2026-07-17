"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChatBubble, ChoiceButton } from "@/components/sisi/ChatBubble";
import { GuestLoginNudge } from "@/components/sisi/GuestLoginNudge";
import { createClient } from "@/lib/supabase/client";
import { createSession, loadSessionMessages } from "@/lib/chatSessions";

export const dynamic = "force-dynamic";

type Role = "user" | "sisi";

type Message = {
  id: string;
  from: Role;
  text: string;
  time: string;
  saveReason?: SaveReason;
  /** Greeting은 API로 안 보냄 (client-only placeholder) */
  greeting?: boolean;
};

type SaveReason = "special" | "shift" | "insight" | "intention";

type Step = "chatting" | "saveOffered" | "saving" | "savedReveal" | "continue";

/** Sísí의 첫 인사 — dashboard 질문을 채팅 톤으로 재변환.
    Client-only, API에 안 보냄 (안 그러면 conversation 처음이 어색해짐). */
const OPENING_GREETING = "Here. What's stayed with you today?";

/** SAVE marker 파싱 */
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

const SAVE_LABELS: Record<SaveReason, string> = {
  special: "a special moment",
  shift: "a shift",
  insight: "an insight",
  intention: "an intention",
};

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

// Guest nudge
const GUEST_MSG_COUNT_KEY = "sisi:guest-msg-count";
const GUEST_NUDGE_SEEN_KEY = "sisi:guest-nudge-seen";
const GUEST_NUDGE_THRESHOLD = 5;

/**
 * /messages/chat — 채팅 immersive 화면.
 *   - No opening screen with chips (dashboard에서 이미 초대함)
 *   - Sísí가 첫 인사 메시지로 채팅 시작 → 자연스럽게 대화
 *   - Back button → dashboard
 *   - ?session=xyz 로 과거 대화 로드
 */
export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<main className="min-h-svh bg-journey-cream" />}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");

  const [step, setStep] = useState<Step>("chatting");
  const [draftInput, setDraftInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const time = useClientTime();

  // 초기 로드 — 과거 세션 이어보기 or 새 대화 (Sísí 인사로 시작)
  useEffect(() => {
    if (sessionParam) {
      // 과거 세션 로드
      (async () => {
        const past = await loadSessionMessages(sessionParam);
        if (past.length === 0) return;
        const converted: Message[] = past.map((m) => ({
          id: m.id,
          from: m.role,
          text: m.content,
          time: formatTime(m.createdAt),
          saveReason: m.saveReason as SaveReason | undefined,
        }));
        setMessages(converted);
        setSessionId(sessionParam);
      })();
    } else {
      // 새 대화 — Sísí 첫 인사 (client-only greeting, API 안 보냄)
      setMessages([
        {
          id: crypto.randomUUID(),
          from: "sisi",
          text: OPENING_GREETING,
          time: currentTime(),
          greeting: true,
        },
      ]);
    }
  }, [sessionParam]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, step]);

  async function sendReply() {
    const input = draftInput.trim();
    if (!input || streaming) return;

    // 로그인 유저: 세션 없으면 생성. 게스트: nudge counter 처리.
    let activeSessionId = sessionId;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (!activeSessionId) {
          activeSessionId = await createSession();
          if (activeSessionId) setSessionId(activeSessionId);
        }
      } else {
        const count =
          parseInt(localStorage.getItem(GUEST_MSG_COUNT_KEY) ?? "0", 10) + 1;
        localStorage.setItem(GUEST_MSG_COUNT_KEY, String(count));

        const seen = localStorage.getItem(GUEST_NUDGE_SEEN_KEY) === "true";
        if (count >= GUEST_NUDGE_THRESHOLD && !seen) {
          setTimeout(() => setShowNudge(true), 2400);
        }
      }
    } catch {
      // 대화는 계속 진행
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      from: "user",
      text: input,
      time,
    };
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

    // 대화 history — greeting은 skip (client-only, API 안 보냄)
    const history = [...messages, userMsg]
      .filter((m) => !m.greeting)
      .map((m) => ({
        role: m.from === "sisi" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          sessionId: activeSessionId,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`chat api ${res.status}`);

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
            // skip
          }
        }
      }

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
    setTimeout(() => setStep("continue"), 3200);
  }

  function chooseDontSave() {
    setStep("chatting");
  }

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-[#F5F4EC]">
      {/* Background — single scene.
          이미지 786×1704 (aspect ratio ~0.46).
          - 모바일 (aspect ratio 비슷): object-bottom 으로 산/풀 살려서 grounded feel
          - 데스크탑 phone-frame (더 정사각형에 가까움): object-center 로 하늘 위주 크롭
          이렇게 하면 두 곳 다 잘리지 않은 것처럼 보임. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/journey/ChatScreen2.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-bottom md:object-center"
        />
      </div>

      <div className="relative z-10 flex h-svh flex-col">
        {/* TOP — back to dashboard. Nav 없음 (immersive). */}
        <header className="shrink-0 pt-[52px] px-[24px]">
          <button
            onClick={() => router.push("/messages")}
            aria-label="Back to messages"
            className="h-9 w-9 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/40 text-journey-navy/80 shadow-sm hover:bg-white/60 transition"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </header>

        {/* MIDDLE — chat scroll */}
        <div className="flex-1 relative min-h-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
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
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <ChatBubble
                    from={msg.from}
                    text={
                      msg.from === "sisi" &&
                      !msg.text &&
                      streaming &&
                      isLastSisi ? (
                        <TypingDots />
                      ) : (
                        msg.text
                      )
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
                <ChoiceButton onClick={chooseSave}>Yes, save this</ChoiceButton>
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
        </div>

        {/* BOTTOM — input pill. Focus 시 pb 축소로 keyboard 밀착. */}
        <footer
          className={`shrink-0 px-[24px] pt-[16px] transition-[padding] duration-300 ${
            inputFocused ? "pb-[20px]" : "pb-[36px]"
          }`}
        >
          {step === "continue" ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col gap-3"
            >
              <Link
                href="/journey"
                className="font-sentient block w-full text-center rounded-[30px] bg-journey-purple/85 backdrop-blur-md border-2 border-white text-journey-navy text-[18px] h-[60px] flex items-center justify-center hover:bg-journey-purple transition"
              >
                Continue Walking
              </Link>
              <button
                onClick={() => setStep("chatting")}
                className="font-sentient block w-full text-center rounded-[30px] bg-white/60 backdrop-blur-md border-2 border-white text-journey-navy text-[18px] h-[60px] flex items-center justify-center hover:bg-white transition"
              >
                Keep talking
              </button>
              <Link
                href="/messages"
                className="font-sentient text-[13px] text-journey-navy/60 mt-1 text-center"
              >
                Back to messages
              </Link>
            </motion.div>
          ) : (
            // Glass morphic input pill — 시스템 통일 (nav/버튼 스타일)
            <div className="flex items-center gap-2 h-[56px] rounded-[28px] bg-white/40 backdrop-blur-md border border-white/50 px-5 shadow-sm">
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
                className="font-sentient flex-1 bg-transparent text-[16px] text-journey-navy placeholder:text-journey-navy/45 outline-none disabled:opacity-50"
              />
              <button
                onClick={sendReply}
                disabled={!draftInput.trim() || streaming}
                aria-label="send"
                className="relative z-10 shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-journey-navy shadow-md hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50 transition"
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
                  className={
                    !draftInput.trim() || streaming ? "opacity-50" : ""
                  }
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          )}
        </footer>
      </div>

      {/* Guest login nudge */}
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
