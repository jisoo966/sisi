"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { PrimaryButton, TextAction } from "@/components/ds";

export const dynamic = "force-dynamic";

/**
 * /intro — 로그인 전 sísí 세계 소개 3장.
 *   Splash → intro → login 흐름의 중간.
 *   유저가 sísí 감성을 먼저 느끼고 로그인하게 함.
 */

type Slide = {
  bg: string;
  overlay: string;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    bg: "/journey/ChatScreen.png",
    overlay:
      "linear-gradient(180deg, rgba(16, 45, 50,0.15) 0%, rgba(16, 45, 50,0.55) 60%, rgba(16, 45, 50,0.85) 100%)",
    title: "Walk with your feelings.",
    subtitle: "A quiet world that moves as you do.",
  },
  {
    bg: "/journey/ChatScreen2.png",
    overlay:
      "linear-gradient(180deg, rgba(16, 45, 50,0.15) 0%, rgba(16, 45, 50,0.55) 60%, rgba(16, 45, 50,0.85) 100%)",
    title: "Capture Moments that stay.",
    subtitle: "Small postcards from your journey.",
  },
  {
    bg: "/mystars/default.png",
    overlay:
      "linear-gradient(180deg, rgba(16, 45, 50,0.35) 0%, rgba(16, 45, 50,0.75) 60%, rgba(16, 45, 50,0.95) 100%)",
    title: "Wish upon what you're\nwalking toward.",
    subtitle: "Each Star, a direction.",
  },
];

export default function IntroPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  function next() {
    if (index < SLIDES.length - 1) {
      setIndex(index + 1);
    } else {
      router.push("/login");
    }
  }

  function skip() {
    router.push("/login");
  }

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-ink">
      {/* Background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={slide.bg}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Overlay for text readability */}
          <div
            className="absolute inset-0"
            style={{ background: slide.overlay }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Skip — top right */}
      <TextAction surface="dark" onClick={skip} className="absolute top-[calc(var(--safe-top)+12px)] right-[12px] z-20">
        Skip
      </TextAction>

      {/* Content — bottom section */}
      <div className="relative z-10 flex min-h-dvh flex-col justify-end px-[20px] pb-[calc(40px+var(--safe-bottom))]">
        {/* Dots pagination */}
        <div className="flex items-center justify-center gap-2 mb-[36px]">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-[6px] rounded-full transition-all duration-400 ${
                i === index ? "w-[24px] bg-paper/90" : "w-[6px] bg-paper/30"
              }`}
            />
          ))}
        </div>

        {/* Title + subtitle */}
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mb-[36px]"
          >
            <h1 className="t-display text-paper mb-3 whitespace-pre-line">
              {slide.title}
            </h1>
            <p className="t-affirmation text-paper/70">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* CTA button */}
        <PrimaryButton surface="dark" block onClick={next}>
          {isLast ? "Begin" : "Next"}
        </PrimaryButton>

        {/* Small legal note on last slide */}
        {isLast && (
          <p className="ds-helper mt-4 text-center" style={{ color: "var(--paper-60)" }}>
            By continuing, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-2 hover:text-paper"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-paper"
            >
              Privacy policy
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
