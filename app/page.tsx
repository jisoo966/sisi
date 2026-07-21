"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

/**
 * Splash — Sísí entry screen
 *
 * Design: from Figma "OnboardingScreen"
 * Background: white arctic fox curled on icy reflective ground
 * Title: SiSi (top)
 * Tagline: A journey with your inner companion (bottom)
 */
export default function SplashPage() {
  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-journey-cream">
      {/* Background scene */}
      <Image
        src="/journey/OnboardingScreen.png"
        alt="A small white fox curled on icy ground, dawn light above"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Foreground overlay — Figma layout: title top, fox middle, tagline bottom */}
      <Link
        href="/intro"
        aria-label="Enter Sísí"
        className="relative z-10 flex h-svh flex-col items-center px-8 group"
      >
        {/* Title — Figma: Sentient Light 여우 위 중앙 */}
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="font-sentient text-[42px] text-journey-navy mt-[100px]"
        >
          SiSi
        </motion.h1>

        <div className="flex-1" />

        {/* Tagline — main + subtitle으로 기능 hint 살짝. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center pb-[80px]"
        >
          <p className="font-sentient text-[20px] leading-normal text-journey-navy">
            A journey with your
            <br />
            inner companion
          </p>
          <p className="font-sentient italic text-[13px] text-journey-navy/70 mt-[10px] tracking-wide">
            keep moments · follow your stars
          </p>
        </motion.div>

        {/* Subtle tap hint — 잔잔한 호흡 (opacity 0.55 ↔ 0.95).
            Lowercase로 sísí voice 유지. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.55, 0.95, 0.55] }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            delay: 1.2,
            ease: "easeInOut",
          }}
          className="absolute bottom-[42px] left-1/2 -translate-x-1/2 font-sentient text-[13px] tracking-[0.15em] text-journey-navy"
        >
          tap to begin
        </motion.div>
      </Link>
    </main>
  );
}
