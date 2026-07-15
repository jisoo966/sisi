"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

/**
 * /login — sísí 브랜드에 맞춘 magic link 로그인.
 *   - Splash와 같은 여우 배경 이미지
 *   - Sentient Light 폰트
 *   - journey palette (cream / navy / purple)
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /** 게스트 모드 — 이메일 없이 시작. Cookie 로 미들웨어 통과.
   *  새 게스트 세션 = 이전 이름/온보딩 상태 리셋 → 항상 fresh 시작. */
  function continueAsGuest() {
    // 1년 유효 게스트 쿠키
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `sisi_guest=1; path=/; max-age=${oneYear}; SameSite=Lax`;
    localStorage.setItem("sisi:guest", "true");
    // 이전 게스트 이름/온보딩 상태 리셋 — 항상 새로 이름 물어봄
    localStorage.removeItem("sisi:guest-name");
    localStorage.removeItem("sisi:guest-onboarded");
    router.push("/onboarding");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    const supabase = createClient();
    // Supabase's Redirect URLs allowlist is configured for the apex domain
    // (hellosisi.co) — www.hellosisi.co isn't in it, and Vercel serves the
    // app at www (apex redirects to www). Without this normalization,
    // emailRedirectTo silently fails Supabase's allowlist check and the
    // magic link never reaches /auth/confirm with a code — the session
    // exchange never happens and the user just gets bounced back to login.
    const redirectOrigin = window.location.origin.replace(
      /^https:\/\/www\./,
      "https://"
    );
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${redirectOrigin}/auth/confirm`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSubmitted(true);
    }
  }

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-journey-cream">
      {/* Background — same as splash */}
      <Image
        src="/journey/OnboardingScreen.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-70"
      />
      {/* Soft cream overlay — 여우 이미지 위 텍스트 readability를 위해 강화.
          가운데(form 영역)를 더 진하게 해서 label/placeholder 잘 보이게. */}
      <div className="absolute inset-0 bg-gradient-to-b from-journey-cream/55 via-journey-cream/85 to-journey-cream/95" />

      {/* Back */}
      <Link
        href="/"
        aria-label="Back"
        className="absolute top-[52px] left-[24px] z-20 h-9 w-9 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/40 text-journey-navy/80 shadow-sm hover:bg-white/60 transition"
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
      </Link>

      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center px-[24px]">
        <div className="w-full max-w-[340px]">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-[48px]"
          >
            <p className="font-sentient italic text-[15px] text-journey-navy mb-3">
              enter your journey
            </p>
            <h1 className="font-sentient text-[42px] text-journey-navy leading-none">
              SiSi
            </h1>
          </motion.div>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block font-sentient text-[13px] text-journey-navy mb-2 tracking-wider"
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
                      className="w-full bg-transparent border-b border-journey-navy/50 focus:border-journey-navy outline-none py-3 font-sentient text-[18px] text-journey-navy placeholder:text-journey-navy/65 transition-colors"
                    />
                  </div>

                  {error && (
                    <p className="font-sentient italic text-[13px] text-journey-oxblood">
                      {error}
                    </p>
                  )}

                  {/* Purple primary CTA. Disabled여도 purple 색상 유지 —
                      opacity만 낮춰서 "이 버튼이야, 아직 활성 안 됨" 신호.
                      완전 다른 색(gray)은 오히려 "다른 버튼" 처럼 헷갈림. */}
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="mt-4 w-full h-[56px] rounded-[24px] bg-journey-purple backdrop-blur-md border border-white/40 text-journey-navy font-sentient text-[16px] shadow-lg hover:brightness-105 active:scale-98 disabled:opacity-55 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "sending..." : "send magic link ✦"}
                  </button>
                </form>

                {/* "or" divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-journey-navy/40" />
                  <span className="font-sentient italic text-[12px] text-journey-navy">
                    or
                  </span>
                  <div className="flex-1 h-px bg-journey-navy/40" />
                </div>

                {/* Guest mode (SECONDARY) — 이메일 없이 바로 시작 */}
                <button
                  onClick={continueAsGuest}
                  className="w-full h-[52px] rounded-[24px] bg-white/50 backdrop-blur-md border border-white/60 text-journey-navy font-sentient text-[15px] hover:bg-white/70 active:scale-98 transition-all"
                >
                  continue as guest
                </button>
                <p className="mt-2 text-center font-sentient italic text-[11px] text-journey-navy">
                  try sísí first · save your journey later
                </p>
                <p className="mt-4 text-center font-sentient text-[11px] text-journey-navy leading-relaxed">
                  by continuing, you agree to our{" "}
                  <Link
                    href="/terms"
                    className="underline underline-offset-2 hover:text-journey-navy"
                  >
                    terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="underline underline-offset-2 hover:text-journey-navy"
                  >
                    privacy policy
                  </Link>
                  .
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
                <div className="text-[32px] text-journey-navy mb-6">✦</div>
                <p className="font-sentient text-[22px] text-journey-navy mb-3">
                  check your inbox.
                </p>
                <p className="font-sentient text-[15px] text-journey-navy/70 leading-relaxed">
                  a link is on its way to{" "}
                  <span className="text-journey-navy italic">{email}</span>.
                  <br />
                  it will find you.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                  className="mt-8 font-sentient text-[13px] text-journey-navy/50 hover:text-journey-navy transition-colors underline underline-offset-2"
                >
                  use a different email
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
