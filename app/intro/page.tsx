"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

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
      "linear-gradient(180deg, rgba(31,42,68,0.15) 0%, rgba(31,42,68,0.55) 60%, rgba(31,42,68,0.85) 100%)",
    title: "walk with your feelings.",
    subtitle: "a quiet world that moves as you do.",
  },
  {
    bg: "/journey/ChatScreen2.png",
    overlay:
      "linear-gradient(180deg, rgba(31,42,68,0.15) 0%, rgba(31,42,68,0.55) 60%, rgba(31,42,68,0.85) 100%)",
    title: "capture moments that stay.",
    subtitle: "small postcards from your journey.",
  },
  {
    bg: "/mystars/default.png",
    overlay:
      "linear-gradient(180deg, rgba(20,17,55,0.35) 0%, rgba(20,17,55,0.75) 60%, rgba(20,17,55,0.95) 100%)",
    title: "wish upon what you're\nwalking toward.",
    subtitle: "each star, a direction.",
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
    <main className="relative min-h-screen w-full overflow-hidden bg-[#1a1737]">
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
      <button
        onClick={skip}
        className="absolute top-[52px] right-[24px] z-20 font-sentient text-[13px] text-white/70 tracking-wider hover:text-white transition-colors"
      >
        skip
      </button>

      {/* Content — bottom section */}
      <div className="relative z-10 flex min-h-screen flex-col justify-end px-[24px] pb-[52px]">
        {/* Dots pagination */}
        <div className="flex items-center justify-center gap-2 mb-[36px]">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-[6px] rounded-full transition-all duration-400 ${
                i === index ? "w-[24px] bg-white/90" : "w-[6px] bg-white/30"
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
            <h1 className="font-sentient text-[32px] text-white leading-[1.15] mb-3 whitespace-pre-line">
              {slide.title}
            </h1>
            <p className="font-sentient italic text-[16px] text-white/70">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* CTA button */}
        <button
          onClick={next}
          className="font-sentient text-[16px] rounded-[24px] bg-journey-purple/90 backdrop-blur-md border border-white/30 text-journey-navy h-[56px] w-full shadow-lg hover:brightness-105 active:scale-98 transition-all"
        >
          {isLast ? "begin ✦" : "next"}
        </button>

        {/* Small legal note on last slide */}
        {isLast && (
          <p className="mt-4 text-center font-sentient text-[11px] text-white/50 leading-relaxed">
            by continuing, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-2 hover:text-white"
            >
              terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-white"
            >
              privacy policy
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
