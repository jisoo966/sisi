"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Message = { role: "user" | "sisi"; content: string };

const OPENING_MESSAGES = [
  "morning. what is calling you in today?",
  "the answer is already inside you. what is on your mind?",
  "i am here. what would you like to bring into the light?",
  "what is the quieter part of you trying to say today?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [opening, setOpening] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setOpening(OPENING_MESSAGES[Math.floor(Math.random() * OPENING_MESSAGES.length)]);
    initSession();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initSession() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id })
      .select()
      .single();

    if (data) setSessionId(data.id);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const sisiMessage: Message = { role: "sisi", content: "" };
    setMessages([...newMessages, sisiMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role === "sisi" ? "assistant" : "user",
            content: m.content,
          })),
          sessionId,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const { text } = JSON.parse(data);
              accumulated += text;
              setMessages([
                ...newMessages,
                { role: "sisi", content: accumulated },
              ]);
            } catch {}
          }
        }
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "sisi", content: "something went quiet. try again in a moment." },
      ]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="min-h-screen bg-[#F5EFE6] flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4 border-b border-[#3D2E25]/8">
        <Link href="/app" className="font-garamond text-sm text-[#6B5648] hover:text-[#3D2E25] transition-colors">
          ← back
        </Link>
        <div className="text-center">
          <p className="font-fraunces text-lg text-[#3D2E25]">Sísí</p>
          <p className="font-garamond italic text-xs text-[#8FA38C]">your inner self friend</p>
        </div>
        <div className="w-12" />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {/* Opening message */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex gap-3"
        >
          <div className="w-8 h-8 bg-[#3D2E25] flex items-center justify-center shrink-0 mt-0.5">
            <span className="font-caveat text-[#D4A82A] text-sm">✦</span>
          </div>
          <div className="bg-[#FAF6F0] border border-[#3D2E25]/8 px-4 py-3 max-w-[80%]">
            <p className="font-garamond text-[#3D2E25] leading-relaxed">
              {opening}
            </p>
          </div>
        </motion.div>

        {/* Chat messages */}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {msg.role === "sisi" && (
                <div className="w-8 h-8 bg-[#3D2E25] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="font-caveat text-[#D4A82A] text-sm">✦</span>
                </div>
              )}
              <div
                className={`px-4 py-3 max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-[#3D2E25] text-[#F5EFE6]"
                    : "bg-[#FAF6F0] border border-[#3D2E25]/8 text-[#3D2E25]"
                }`}
              >
                <p className="font-garamond leading-relaxed">
                  {msg.content}
                  {msg.role === "sisi" && loading && i === messages.length - 1 && !msg.content && (
                    <span className="inline-flex gap-1 ml-1">
                      {[0, 1, 2].map((j) => (
                        <motion.span
                          key={j}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }}
                          className="w-1 h-1 bg-[#D4A82A] rounded-full inline-block"
                        />
                      ))}
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-8 pt-4 border-t border-[#3D2E25]/8">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="say something..."
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent border-b border-[#3D2E25]/30 focus:border-[#D4A82A] outline-none py-3 font-garamond text-base text-[#3D2E25] placeholder-[#6B5648]/40 transition-colors resize-none disabled:opacity-40"
            style={{ minHeight: "44px", maxHeight: "120px" }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-[#3D2E25] flex items-center justify-center hover:bg-[#3A302A] disabled:opacity-30 transition-all shrink-0"
          >
            <span className="text-[#F5EFE6] text-sm">→</span>
          </button>
        </div>
        <p className="font-garamond italic text-xs text-[#8FA38C]/60 mt-2 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </main>
  );
}
