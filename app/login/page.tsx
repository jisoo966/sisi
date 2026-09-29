"use client";

import { IconBack, IconButton, PrimaryButton, SecondaryButton, StarGlyph, TextAction } from "@/components/ds";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 매직링크 실패 시 confirm route가 ?error= 붙여서 login으로 되돌림.
  // 유저가 무슨 일 있었는지 이해할 수 있도록 명확히 표시.
  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    if (err === "link_expired") {
      setError("that link expired. request a fresh one below.");
    } else if (err === "wrong_browser") {
      setError("open the link in the same browser you started in.");
    } else {
      setError(`sign-in failed (${err}). try again below.`);
    }
  }, [searchParams]);

  /** 게스트 모드 — 이메일 없이 시작. Cookie 로 미들웨어 통과.
   *  새 게스트 세션 = 이전 이름/온보딩 상태 리셋 → 항상 fresh 시작.
   *  중요: 예전 auth 세션이 남아있으면 onboarding이 그 프로필을 잡아버려서
   *  이름을 다시 안 물어봄 → 게스트 모드 진입 시 supabase.signOut() 필수. */
  async function continueAsGuest() {
    const supabase = createClient();
    // 이전 이메일 로그인 세션 있으면 지움 — 진짜 fresh 게스트로 시작
    try {
      await supabase.auth.signOut();
    } catch {
      // 세션 없으면 그냥 통과
    }

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
    // 유저가 지금 있는 도메인 그대로 redirect — 쿠키 domain 안 맞아서 세션 소실되는 문제 방지.
    // ⚠️ Supabase Dashboard → Auth → URL Configuration에 아래 URL 두 개 다 추가되어 있어야 함:
    //     https://hellosisi.co/auth/confirm
    //     https://www.hellosisi.co/auth/confirm
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
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
    <main className="relative min-h-dvh w-full overflow-hidden bg-journey-cream">
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
      <div className="absolute inset-0 bg-gradient-to-b from-paper/55 via-paper/85 to-paper/95" />

      {/* Back */}
      <IconButton href="/" label="Back" filled className="absolute top-[calc(var(--safe-top)+16px)] left-[16px] z-20">
        <IconBack />
      </IconButton>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-[24px]">
        <div className="w-full max-w-[340px]">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-[48px]"
          >
            <p className="t-affirmation text-ink mb-3">Enter your journey</p>
            <h1 className="t-display text-ink">Sísí</h1>
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
                    <label htmlFor="email" className="ds-label">
                      Your email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="ds-field"
                    />
                  </div>

                  {error && (
                    <p className="ds-error" role="alert">
                      {error}
                    </p>
                  )}

                  {/* Purple primary CTA. Disabled여도 purple 색상 유지 —
                      opacity만 낮춰서 "이 버튼이야, 아직 활성 안 됨" 신호.
                      완전 다른 색(gray)은 오히려 "다른 버튼" 처럼 헷갈림. */}
                  <PrimaryButton type="submit" block loading={loading} disabled={!email.trim()} className="mt-2">
                    Send magic link
                  </PrimaryButton>
                </form>

                {/* "or" divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-ink/15" />
                  <span className="t-meta text-ink/60">or</span>
                  <div className="flex-1 h-px bg-ink/15" />
                </div>

                {/* Guest mode (SECONDARY) — 이메일 없이 바로 시작 */}
                <SecondaryButton block onClick={continueAsGuest}>
                  Continue as guest
                </SecondaryButton>
                <p className="ds-helper mt-2 text-center">Try Sísí first, and save your journey later.</p>
                <p className="ds-helper mt-4 text-center">
                  By continuing, you agree to our{" "}
                  <Link
                    href="/terms"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Privacy policy
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
                <div className="mb-6 flex justify-center"><StarGlyph size={32} /></div>
                <p className="t-screen-title text-ink mb-3">Check your inbox.</p>
                <p className="t-body text-ink/80">
                  A link is on its way to <span className="italic">{email}</span>.
                  <br />
                  It will find you.
                </p>
                <p className="ds-helper mt-6">
                  Open the link in the same browser you started in. If it opens inside your mail app, tap the compass icon to open it in Safari.
                </p>
                <TextAction
                  className="mt-6"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                >
                  Use a different email
                </TextAction>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams는 Suspense boundary 필수
  return (
    <Suspense fallback={<main className="min-h-dvh w-full bg-paper" />}>
      <LoginInner />
    </Suspense>
  );
}
