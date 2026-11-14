"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { IconMoon, IconPath, IconPencil, IconSend, PrimaryButton, StatusChip, TextAction, useKeyboardInset } from "@/components/ds";
import { LOCAL_ONLY } from "@/lib/dataMode";
import { createClient } from "@/lib/supabase/client";
import { createStar, saveStar } from "@/lib/myStars";
import { coverWithClouds } from "@/lib/cloudVeil";
import { usePageBg } from "@/lib/usePageBg";

export const dynamic = "force-dynamic";

/**
 * /onboarding — the beginning, under one night sky.
 *
 *   gather  stars and dust gather into Sísí (plays on its own; a tap skips)
 *   name    "Hello, I'm Sísí. What should I call you?"
 *   wish    the first wish, in the person's own words (a chip starts a sentence)
 *   send    Sísí holds the Star; "Send it up" lets it fly
 *   sky     the camera rises with it: "Your Star is in the sky"
 *   ways    how we'll spend time with it (three lines) → "Begin my journey"
 *
 * One sky image throughout: its lower, bluer part first; the camera rises
 * with the Star to its darkest top. "Begin my journey" descends through the
 * clouds to the Journey (lib/cloudVeil.ts), where the Map is shown once
 * (MapWelcome, flagged by sisi:map-welcome).
 */

type Step = "gather" | "name" | "wish" | "send" | "sky" | "ways";

const ART = "/V2/onboarding/";

/** how far up the sky the camera is (background-position y) */
const SKY_Y: Record<Step, string> = {
  gather: "100%",
  name: "100%",
  wish: "100%",
  send: "100%",
  sky: "45%",
  ways: "0%",
};

/** a chip starts the sentence; the words stay theirs to change */
const STARTERS: { label: string; wish: string }[] = [
  { label: "Calm days", wish: "My days feel calm and light." },
  { label: "Love", wish: "I am loved, and I love freely." },
  { label: "Abundance", wish: "Good things come to me easily." },
  { label: "Work I love", wish: "I do work I love, and it loves me back." },
];

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

export default function OnboardingPage() {
  usePageBg("#06101f");
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("gather");
  const [name, setName] = useState("");
  const [wish, setWish] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  /** "Send it up" pressed: the Star is flying, the ground falls away */
  const [flying, setFlying] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const member = useRef<{ id: string; email?: string } | null>(null);

  useKeyboardInset(step === "name" || step === "wish");

  // already begun → the Journey
  useEffect(() => {
    (async () => {
      let user: { id: string; email?: string; is_anonymous?: boolean } | null = null;
      try {
        user = (await createClient().auth.getUser()).data.user;
      } catch {
        // offline: begin as a guest
      }
      if (user && !user.is_anonymous && !LOCAL_ONLY) {
        const { data: profile } = await createClient()
          .from("profiles")
          .select("onboarded, display_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.onboarded) {
          // remembered on this device too, so the Journey never sends them back here
          localStorage.setItem("sisi:guest-onboarded", "true");
          if (profile.display_name) localStorage.setItem("sisi:guest-name", profile.display_name);
          return router.replace("/journey");
        }
        if (profile?.display_name) setName(profile.display_name);
        member.current = { id: user.id, email: user.email };
      } else {
        if (localStorage.getItem("sisi:guest-onboarded") === "true") return router.replace("/journey");
        const n = localStorage.getItem("sisi:guest-name");
        if (n) setName(n);
      }
      // development only: /onboarding?at=send opens one screen directly
      const at = process.env.NODE_ENV !== "production" ? new URLSearchParams(location.search).get("at") : null;
      if (at && at in SKY_Y) {
        setName((v) => v || "Jisoo");
        setWish("My days feel calm and light.");
        setStep(at as Step);
      }
      setReady(true);
    })();
  }, [router]);

  // the gathering plays on its own
  useEffect(() => {
    if (!ready || step !== "gather") return;
    const t = setTimeout(() => setStep("name"), 3400);
    return () => clearTimeout(t);
  }, [ready, step]);

  // the Star rests in the sky a moment, then Sísí says how the days go
  useEffect(() => {
    if (step !== "sky") return;
    const t = setTimeout(() => setStep("ways"), 4200);
    return () => clearTimeout(t);
  }, [step]);

  const keepName = () => {
    if (!name.trim()) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    setStep("wish");
  };

  const pick = (s: (typeof STARTERS)[number]) => {
    setPicked(s.label);
    setWish(s.wish);
  };

  const makeStar = () => {
    if (!wish.trim()) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    setStep("send");
  };

  const sendUp = () => {
    if (flying) return;
    setFlying(true);
    setTimeout(() => {
      setStep("sky");
      setFlying(false);
    }, 1500);
  };

  const begin = async () => {
    if (leaving) return;
    setLeaving(true);
    const n = name.trim();
    const star = createStar(wish, "someday", []);
    try {
      localStorage.setItem("sisi:guest-name", n);
      localStorage.setItem("sisi:guest-onboarded", "true");
      if (member.current) {
        await createClient().from("profiles").upsert({
          id: member.current.id,
          email: member.current.email,
          display_name: n,
          onboarded: true,
        });
      } else {
        localStorage.setItem("sisi:guest", "true");
        localStorage.setItem("sisi:guest-name", n);
        localStorage.setItem("sisi:guest-onboarded", "true");
        document.cookie = `sisi_guest=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      }
      await saveStar(star);
    } catch (err) {
      console.error("onboarding save failed:", err);
    }
    // the Journey shows the Map once, after the landing
    localStorage.setItem("sisi:map-welcome", "pending");
    localStorage.removeItem("sisi:tour");
    await coverWithClouds();
    router.replace(`/journey?walk=${star.id}`);
  };

  if (!ready) return <main className="onb" />;

  return (
    <main className="onb" onClick={step === "gather" ? () => setStep("name") : step === "sky" ? () => setStep("ways") : undefined}>
      <motion.div
        className="onb-sky"
        aria-hidden
        initial={false}
        animate={{ backgroundPositionY: SKY_Y[flying ? "sky" : step] }}
        transition={{ duration: flying ? 1.5 : 1.6, ease: [0.45, 0, 0.25, 1] }}
      />

      <AnimatePresence mode="wait">
        {step === "gather" && (
          <motion.div key="gather" className="onb-layer" {...fade} exit={{ opacity: 0, transition: { duration: 0.6 } }}>
            <motion.img
              src={`${ART}dust.webp`}
              alt=""
              className="onb-art"
              style={{ width: "92%", left: "4%", bottom: 300 }}
              initial={{ opacity: 0, scale: 1.25 }}
              animate={{ opacity: [0, 0.9, 0.5], scale: 1 }}
              transition={{ duration: 2.6, ease: "easeOut" }}
            />
            <motion.img
              src={`${ART}glow-cloud.webp`}
              alt=""
              className="onb-art onb-screen"
              style={{ width: "84%", left: "8%", bottom: 190 }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.95, 0.35], scale: 1 }}
              transition={{ duration: 2.8, delay: 0.5, ease: "easeOut" }}
            />
            {/* the ground arrives with her: she is never left floating */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.5 }}>
              <Ground />
            </motion.div>
            <motion.img
              src={`${ART}fox.webp`}
              alt="Sísí"
              className="onb-art onb-fox"
              style={{ width: 170, left: "calc(50% - 85px)", bottom: 205 }}
              initial={{ opacity: 0, filter: "brightness(2.2) blur(6px)" }}
              animate={{ opacity: 1, filter: "brightness(1) blur(0px)" }}
              transition={{ duration: 1.2, delay: 1.7 }}
            />
          </motion.div>
        )}

        {step === "name" && (
          <motion.div key="name" className="onb-layer" {...fade}>
            <div className="ds-note onb-bubble t-dialogue">
              Hello, I’m Sísí.
              <br />
              What should I call you?
            </div>
            <Ground />
            <img src={`${ART}fox.webp`} alt="Sísí" className="onb-art onb-fox" style={{ width: 170, left: "calc(50% - 85px)", bottom: 205 }} />
            <form
              className="onb-name"
              onSubmit={(e) => {
                e.preventDefault();
                keepName();
              }}
            >
              <input
                className="ds-field ds-on-dark"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                placeholder="Your name"
                aria-label="Your name"
                autoComplete="given-name"
                enterKeyHint="send"
              />
              <button type="submit" className="ds-icon-btn onb-send" aria-label="Continue" disabled={!name.trim()}>
                <IconSend size={20} />
              </button>
            </form>
          </motion.div>
        )}

        {step === "wish" && (
          <motion.div key="wish" className="onb-layer" {...fade}>
            <img src={`${ART}fox-smile.webp`} alt="Sísí" className="onb-art onb-fox" style={{ width: 150, left: "calc(50% - 75px)", top: "calc(var(--safe-top, 0px) + 84px)" }} />
            <motion.div
              className="ds-paper onb-sheet"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
            >
              <p className="t-meta onb-center" style={{ color: "var(--ink-60)", marginBottom: 6 }}>
                Nice to meet you, {name.trim()}.
              </p>
              <p id="wish-q" className="t-card-title onb-center" style={{ marginBottom: 18 }}>
                What would you love
                <br />
                to come into your life?
              </p>
              <div className="ds-chip-row" style={{ justifyContent: "center", marginBottom: 20 }}>
                {STARTERS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    className={`ds-reply-chip ${picked === s.label ? "is-picked" : ""}`}
                    aria-pressed={picked === s.label}
                    onClick={() => pick(s)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <label className="ds-label" htmlFor="wish-words">
                Your wish, in your words
              </label>
              <textarea
                id="wish-words"
                className="ds-field t-body onb-wish"
                value={wish}
                onChange={(e) => setWish(e.target.value.slice(0, 160))}
                placeholder="My days feel calm and light."
                rows={3}
              />
              <p className="ds-helper" style={{ margin: "8px 0 0" }}>
                Write it as if it’s already true.
              </p>
              <div style={{ marginTop: 26 }}>
                <PrimaryButton block disabled={!wish.trim()} onClick={makeStar}>
                  Make this my Star
                </PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}

        {step === "send" && (
          <motion.div key="send" className="onb-layer" {...fade}>
            <motion.div className="ds-note onb-bubble" animate={{ opacity: flying ? 0 : 1 }}>
              <p className="t-dialogue" style={{ margin: "0 0 8px" }}>
                Let’s send your wish up to the sky.
              </p>
              <p className="t-affirmation" style={{ margin: 0, color: "var(--ink-80)" }}>
                “{wish.trim()}”
              </p>
            </motion.div>
            {/* the ground falls away as the camera rises with the Star */}
            <motion.div
              className="onb-layer"
              animate={{ y: flying ? "75%" : 0, opacity: flying ? 0 : 1 }}
              transition={{ duration: 1.4, ease: [0.45, 0, 0.55, 1] }}
            >
              <Ground />
              <img src={`${ART}sisi-holding.webp`} alt="Sísí holding your Star" className="onb-art onb-fox" style={{ width: 220, left: "calc(50% - 110px)", bottom: 190 }} />
            </motion.div>
            {/* the Star is its own layer: it leaves her paws and flies up */}
            <motion.img
              src={`${ART}sisi-star.webp`}
              alt=""
              className="onb-art onb-star"
              style={{ width: 36, left: "calc(50% - 55px)", bottom: 312 }}
              animate={
                flying
                  ? { y: [0, -40, -420], x: [0, 6, 60], scale: [1, 1.25, 0.7], opacity: [1, 1, 0] }
                  : { y: [0, -4, 0] }
              }
              transition={flying ? { duration: 1.5, times: [0, 0.25, 1], ease: "easeIn" } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div className="onb-foot" animate={{ opacity: flying ? 0 : 1 }}>
              <PrimaryButton surface="dark" block onClick={sendUp} disabled={flying}>
                Send it up
              </PrimaryButton>
              <TextAction surface="dark" onClick={() => setStep("wish")} disabled={flying}>
                Change my words
              </TextAction>
            </motion.div>
          </motion.div>
        )}

        {step === "sky" && (
          <motion.div key="sky" className="onb-layer" {...fade}>
            <motion.img
              src={`${ART}star.webp`}
              alt="Your Star"
              className="onb-art"
              style={{ width: 170, left: "calc(50% - 85px)", top: "20%" }}
              initial={{ opacity: 0, scale: 0.3, y: 160 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              className="onb-skyline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
            >
              <p className="onb-wish-line">{wish.trim()}</p>
              <StatusChip surface="dark" tone="star">
                Your Star is in the sky
              </StatusChip>
            </motion.div>
          </motion.div>
        )}

        {step === "ways" && (
          <motion.div key="ways" className="onb-layer" {...fade}>
            <motion.img
              src={`${ART}star.webp`}
              alt=""
              className="onb-art"
              style={{ width: 58, right: 32, top: "calc(var(--safe-top, 0px) + 40px)" }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="ds-note onb-bubble t-dialogue" style={{ top: "calc(var(--safe-top, 0px) + 96px)" }}>
              Your Star is up there now.
              <br />
              Here’s how we’ll spend our days.
            </div>
            <div className="onb-ways-wrap">
              <img src={`${ART}fox-smile.webp`} alt="Sísí" className="onb-ways-fox" />
              <motion.div
                className="ds-paper onb-ways"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { duration: 0.5, delay: 0.2 } }}
              >
                <Way icon={<IconPath size={24} />}>Each day, one small thing for your Star.</Way>
                <Way icon={<IconPencil size={24} />}>When something good happens, keep it.</Way>
                <Way icon={<IconMoon size={24} />}>At night, I’ll ask what felt good.</Way>
              </motion.div>
            </div>
            <div className="onb-foot">
              <PrimaryButton surface="dark" block loading={leaving} onClick={begin}>
                Begin my journey
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .onb {
          position: relative;
          height: 100dvh;
          min-height: 100dvh;
          width: 100%;
          overflow: hidden;
          background: #06101f;
          color: var(--sisi-paper);
        }
        .onb-sky {
          position: absolute;
          inset: 0;
          background: #06101f url(${ART}sky.webp) no-repeat;
          background-size: max(164%, 82dvh) auto;
          background-position: 50% 100%;
        }
        .onb-layer {
          position: absolute;
          inset: 0;
        }
        .onb-art {
          position: absolute;
          display: block;
          user-select: none;
          pointer-events: none;
        }
        .onb-screen {
          mix-blend-mode: screen;
        }
        .onb-fox {
          filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.25));
        }
        .onb-star {
          filter: drop-shadow(0 0 10px rgba(255, 214, 120, 0.7));
        }
        .onb-ground {
          position: absolute;
          left: 50%;
          bottom: 150px;
          width: 144%;
          max-width: none;
          transform: translateX(-50%);
          pointer-events: none;
        }
        .onb-bubble {
          position: absolute;
          left: 44px;
          right: 44px;
          top: calc(var(--safe-top, 0px) + 110px);
          padding: 16px 20px;
          text-align: center;
          color: var(--sisi-ink);
        }
        .onb-center {
          text-align: center;
          margin: 0;
        }
        .onb-name {
          position: absolute;
          left: 20px;
          right: 20px;
          bottom: calc(max(var(--ds-kb, 0px) + 12px, var(--safe-bottom, 0px) + 44px));
          display: flex;
          gap: 8px;
          align-items: center;
          transition: bottom 200ms ease;
        }
        .onb-name .ds-field {
          flex: 1;
          border-radius: 999px;
          padding: 0 20px;
          min-height: 48px;
        }
        .onb-send {
          background: var(--sisi-paper);
          color: var(--sisi-ink);
        }
        .onb-send:disabled {
          opacity: 0.45;
        }
        .onb-sheet {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(var(--safe-top, 0px) + 262px);
          bottom: var(--ds-kb, 0px);
          overflow-y: auto;
          border-radius: 26px 24px 0 0;
          padding: 30px 24px calc(32px + var(--safe-bottom, 0px));
          color: var(--sisi-ink);
        }
        .ds-reply-chip.is-picked {
          background: var(--ink-08);
          border-image-source: url(/assets/ui/sketch-pill-bold-ink.svg);
        }
        .onb-wish {
          min-height: 92px;
          resize: none;
        }
        .onb-foot {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: calc(var(--safe-bottom, 0px) + 40px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .onb-skyline {
          position: absolute;
          left: 24px;
          right: 24px;
          top: calc(20% + 222px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .onb-wish-line {
          margin: 0;
          text-align: center;
          color: var(--sisi-paper);
          font-family: var(--font-editorial);
          font-style: italic;
          font-size: var(--text-wish, 24px);
          line-height: 1.3;
        }
        .onb-ways-wrap {
          position: absolute;
          left: 24px;
          right: 24px;
          top: calc(var(--safe-top, 0px) + 236px);
        }
        /* Sísí sits on the paper: her paws rest on its top edge */
        .onb-ways-fox {
          display: block;
          width: 116px;
          margin: 0 auto -20px;
          position: relative;
          z-index: 0;
          filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.25));
        }
        .onb-ways {
          position: relative;
          z-index: 1;
          border-radius: 18px 16px 19px 15px;
          padding: 8px 20px;
          color: var(--sisi-ink);
        }
        .onb-way {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 12px 0;
        }
        .onb-way + .onb-way {
          border-top: 1px solid var(--ink-08);
        }
        .onb-way p {
          margin: 0;
        }
        .onb-way svg {
          flex: none;
        }
        @media (max-height: 700px) {
          .onb-ways-wrap {
            top: calc(var(--safe-top, 0px) + 196px);
          }
          .onb-sheet {
            top: calc(var(--safe-top, 0px) + 200px);
          }
        }
      `}</style>
    </main>
  );
}

/** the grass Sísí stands on (her paws on its top edge) */
function Ground() {
  return <img src={`${ART}grass.webp`} alt="" className="onb-ground" draggable={false} />;
}

function Way({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="onb-way">
      {icon}
      <p className="t-body">{children}</p>
    </div>
  );
}
