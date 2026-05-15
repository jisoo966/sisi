"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    setLoading(false);

    if (error) {
      setError("something went quiet. try again in a moment.");
    } else {
      setSubmitted(true);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5EFE6] flex flex-col items-center justify-center px-6">
      {/* Back */}
      <Link
        href="/"
        className="absolute top-8 left-6 md:left-12 font-garamond text-sm text-[#6B5648] hover:text-[#3D2E25] transition-colors"
      >
        ← back
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <div className="font-caveat text-2xl text-[#D4A82A] mb-3">☾</div>
          <h1 className="font-fraunces text-3xl text-[#3D2E25] mb-2">Sísí</h1>
          <p className="font-garamond italic text-[#6B5648] text-base">
            welcome back, love.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block font-garamond text-sm text-[#6B5648] mb-2"
                  >
                    your email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-transparent border-b border-[#3D2E25]/30 focus:border-[#D4A82A] outline-none py-3 font-garamond text-base text-[#3D2E25] placeholder-[#6B5648]/40 transition-colors"
                  />
                </div>

                {error && (
                  <p className="font-garamond italic text-sm text-[#C4847C]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="mt-4 w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "sending..." : "send magic link"}
                </button>
              </form>

              <p className="mt-8 text-center font-garamond text-sm text-[#6B5648]/60 italic">
                no password. just you.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <div className="font-caveat text-3xl text-[#D4A82A] mb-6">✦</div>
              <p className="font-fraunces text-xl text-[#3D2E25] mb-3">
                check your inbox.
              </p>
              <p className="font-garamond text-[#6B5648] leading-relaxed">
                a link is on its way to{" "}
                <span className="text-[#3D2E25] italic">{email}</span>.{" "}
                it will find you.
              </p>
              <button
                onClick={() => { setSubmitted(false); setEmail(""); }}
                className="mt-8 font-garamond text-sm text-[#6B5648]/60 hover:text-[#3D2E25] transition-colors underline underline-offset-2"
              >
                use a different email
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
