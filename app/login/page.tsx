"use client";

import { IconBack, IconButton, PrimaryButton, TextAction, useKeyboardInset } from "@/components/ds";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { SisiChatCharacter } from "@/components/sisi/journey-v2/SisiChatCharacter";
import { NightBackdrop } from "@/components/sisi/stars/NightBackdrop";
import { usePageBg } from "@/lib/usePageBg";
import { RESTORE_AFTER_SIGN_IN } from "@/lib/cloudSave";

export const dynamic = "force-dynamic";

/**
 * /login — signing in with a magic link, in the night of the beginning:
 * the same sky as the first night (/intro), one floating paper, Sísí on its
 * edge (she is the one speaking). Or begin as a guest instead.
 */
function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** keep: this phone's guest (an anonymous account) adds an email — the same
   *  account, everything kept stays. signin: an account made before. */
  const [mode, setMode] = useState<"keep" | "signin">("signin");
  const [taken, setTaken] = useState(false);
  useEffect(() => {
    if (searchParams.get("mode") === "signin") return;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        const anon = data.session?.user.is_anonymous;
        const kept = !!(localStorage.getItem("sisi:stars") || localStorage.getItem("sisi:moments-v1"));
        if (anon && kept) setMode("keep");
      })
      .catch(() => undefined);
  }, [searchParams]);
  usePageBg("#06101f");
  useKeyboardInset(!submitted);

  // 매직링크 실패 시 confirm route가 ?error= 붙여서 login으로 되돌림.
  // 유저가 무슨 일 있었는지 이해할 수 있도록 명확히 표시.
  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    if (err === "link_expired") {
      setError("That link expired. Ask for a new one below.");
    } else if (err === "wrong_browser") {
      setError("Open the link in the same browser you started in.");
    } else {
      setError(`Signing in didn’t work (${err}). Try once more below.`);
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
    router.push("/journey"); // the first time begins in the meadow, with Sísí
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    const supabase = createClient();
    if (mode === "keep") {
      // the same account: the email is added to it (nothing moves, nothing is lost)
      const { error } = await supabase.auth.updateUser(
        { email: email.trim().toLowerCase() },
        { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/journey` },
      );
      setLoading(false);
      if (error) {
        const already = /already|registered|exists/i.test(error.message);
        setTaken(already);
        setError(already ? "That email already has a place here." : "It didn’t send just now. Try once more?");
      } else setSubmitted(true);
      return;
    }
    // signing in to an account made before: its backup comes to this phone
    localStorage.setItem(RESTORE_AFTER_SIGN_IN, "1");
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
    <main className="lg">
      <NightBackdrop />

      <header className="lg-head">
        <IconButton surface="dark" label="Back" onClick={() => router.push("/")}>
          <IconBack />
        </IconButton>
      </header>

      <motion.section
        className="lg-wrap"
        initial={{ y: "120%" }}
        animate={{ y: 0, transition: { duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] } }}
        aria-label={submitted ? "Check your email" : "Sign in"}
      >
        <div className="lg-sisi" aria-hidden>
          <SisiChatCharacter expression="listening" />
        </div>
        <div className="lg-paper ds-paper ds-deckle">
          <AnimatePresence mode="wait" initial={false}>
            {!submitted ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {mode === "keep" ? (
                  <>
                    <h1 className="lg-title">Keep what you’ve left.</h1>
                    <p className="lg-say">
                      Right now your Stars and moments live on this phone, with a quiet backup. Add your email to carry them to any device.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="lg-title">Welcome back.</h1>
                    <p className="lg-say">I’ll send a link to your email. Open it here, and your Stars will be waiting.</p>
                  </>
                )}
                <form onSubmit={handleSubmit}>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Your email"
                    required
                    autoComplete="email"
                    className="ds-field lg-field"
                  />
                  {error && (
                    <p className="ds-error lg-error" role="alert">
                      {error}
                    </p>
                  )}
                  {taken && mode === "keep" && (
                    <TextAction
                      className="lg-quiet lg-switch"
                      onClick={() => {
                        setMode("signin");
                        setTaken(false);
                        setError("");
                      }}
                    >
                      Sign in with it instead
                    </TextAction>
                  )}
                  <PrimaryButton type="submit" block loading={loading} disabled={!email.trim()}>
                    Send me a link
                  </PrimaryButton>
                </form>
                {mode === "keep" ? (
                  <TextAction className="lg-quiet" onClick={() => setMode("signin")}>
                    I already have an account
                  </TextAction>
                ) : (
                  <TextAction className="lg-quiet" onClick={continueAsGuest}>
                    Begin as a guest instead
                  </TextAction>
                )}
                <p className="lg-legal">
                  By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>.
                </p>
              </motion.div>
            ) : (
              <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <h1 className="lg-title">Check your email.</h1>
                <p className="lg-say">
                  A link is on its way to <em>{email}</em>.{" "}
                  {mode === "keep" ? "Open it to confirm. Everything you’ve kept stays as it is." : "It will find you."}
                </p>
                <p className="lg-helper">Open it in this same browser. If it opens inside your mail app, choose “Open in Safari”.</p>
                <TextAction
                  className="lg-quiet"
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
      </motion.section>

      <style jsx global>{`
        .lg { position: fixed; inset: 0; overflow: clip; background: #06101f; color: var(--sisi-paper); }
        .lg-head { position: absolute; z-index: 6; top: 0; left: 0; padding: max(calc(var(--safe-top, 0px) + 12px), 44px) 0 0 max(8px, var(--safe-left)); }
        /* the floating paper of the beginning: 16px above the bottom, or 12px above the keyboard */
        .lg-wrap {
          position: absolute; left: 0; right: 0; margin: 0 auto; z-index: 5;
          width: min(calc(100% - 2 * max(16px, var(--safe-left), var(--safe-right))), 420px);
          bottom: max(calc(16px + var(--safe-bottom)), calc(var(--ds-kb, 0px) + 12px));
          transition: bottom 220ms var(--ease-sisi);
        }
        .lg-sisi { position: absolute; top: 0; right: 76px; width: 0; height: 0; z-index: 3; transform: scale(0.66); transform-origin: 0 0; pointer-events: none; }
        .lg-paper { position: relative; z-index: 1; padding: var(--space-6) var(--space-5) var(--space-5); color: var(--sisi-ink); --paper-grain-layer: var(--grain-focus); filter: drop-shadow(0 10px 26px rgba(16, 45, 50, 0.42)); }
        .lg-title { margin: 0 0 var(--space-3); font-family: var(--font-editorial); font-weight: 300; font-size: var(--text-paper-title); line-height: 1.2; letter-spacing: -0.01em; }
        .lg-say { margin: 0 0 var(--space-5); font-family: var(--font-editorial); font-size: var(--text-dialogue); line-height: var(--leading-dialogue); letter-spacing: var(--tracking-editorial); text-wrap: pretty; }
        .lg-say em { font-style: italic; }
        .lg-field { margin-bottom: var(--space-4); font-family: var(--font-editorial); font-size: 17px; }
        .lg-error { margin: calc(-1 * var(--space-2)) 0 var(--space-3); }
        .lg-quiet { display: block; margin: var(--space-2) auto 0; }
        .lg-switch { margin: calc(-1 * var(--space-2)) auto var(--space-3); }
        .lg-helper { margin: 0 0 var(--space-3); font-family: var(--font-ui); font-size: var(--text-meta); line-height: 1.5; color: var(--ink-60); }
        .lg-legal { margin: var(--space-3) 0 0; text-align: center; font-family: var(--font-ui); font-size: 11.5px; color: var(--ink-60); }
        .lg-legal a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
        html.kb-open .lg-legal { display: none; } /* keyboard up: only what's needed */
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams는 Suspense boundary 필수
  return (
    <Suspense fallback={<main style={{ minHeight: "100dvh", background: "#06101f" }} />}>
      <LoginInner />
    </Suspense>
  );
}
