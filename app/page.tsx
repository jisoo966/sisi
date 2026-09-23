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
    <main
      className="relative min-h-svh w-full overflow-hidden bg-journey-cream"
      // Fox 이미지 로드 전에도 sísí 톤 유지 (흰 flash 방지). CSS 로드 안 된 순간에도 유지되게 inline.
      style={{ backgroundColor: "#F5E9C8" }}
    >
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
        {/* Title + Tagline — fade-in duration 대폭 단축(1.4→0.5s). 이전에는 텍스트가
            여우 보인 뒤 한참 뒤에야 나타나서 "여우가 먼저 보임" 현상. */}
        <motion.h1
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="font-sentient text-[42px] text-journey-navy mt-[100px]"
        >
          SiSi
        </motion.h1>

        <div className="flex-1" />

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
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
