"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F5EFE6] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 pt-8">
        <span className="font-fraunces text-xl text-[#3D2E25] tracking-wide">
          Sísí
        </span>
        <Link
          href="/login"
          className="font-garamond text-sm text-[#6B5648] hover:text-[#3D2E25] transition-colors"
        >
          sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="w-px h-16 bg-[#D4A82A] mx-auto mb-12 origin-top"
        />

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.2}
          className="font-garamond italic text-[#6B5648] text-lg mb-6 tracking-wide"
        >
          meet sísí.
        </motion.p>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.4}
          className="font-fraunces text-5xl md:text-7xl text-[#3D2E25] leading-tight mb-8 max-w-2xl"
        >
          your inner self
          <br />
          <em className="not-italic text-[#C4847C]">friend.</em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.6}
          className="font-garamond text-xl text-[#6B5648] mb-12 max-w-md leading-relaxed"
        >
          manifest with sísí.{" "}
          <span className="italic">what is meant for you is on its way.</span>
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.8}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <Link
            href="/login"
            className="font-garamond px-8 py-4 bg-[#3D2E25] text-[#F5EFE6] text-base hover:bg-[#3A302A] transition-colors"
          >
            begin
          </Link>
          <span className="font-garamond text-sm text-[#8FA38C] italic">
            free to start
          </span>
        </motion.div>

        {/* Decorative line bottom */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 1, ease: [0.22, 1, 0.36, 1] }}
          className="w-px h-16 bg-[#D4A82A] mx-auto mt-16 origin-bottom"
        />
      </section>

      {/* Features — 3 pillars */}
      <section className="px-6 md:px-12 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 border-t border-[#D4A82A]/20 pt-16"
        >
          {[
            {
              symbol: "☾",
              title: "living vision board",
              body: "an image that holds your becoming. morning, afternoon, evening — it speaks to where you are.",
            },
            {
              symbol: "✦",
              title: "angel messages",
              body: "soft reminders that find you. not scheduled. not a notification. a friend, checking in.",
            },
            {
              symbol: "◎",
              title: "sísí chat",
              body: "when the doubt is loud. sísí listens, reflects, and reminds you of what you already know.",
            },
          ].map((item) => (
            <div key={item.title} className="text-center">
              <div className="font-caveat text-2xl text-[#D4A82A] mb-4">
                {item.symbol}
              </div>
              <h3 className="font-fraunces text-lg text-[#3D2E25] mb-3">
                {item.title}
              </h3>
              <p className="font-garamond text-[#6B5648] text-base leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Bottom CTA */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="bg-[#3D2E25] px-6 py-20 text-center"
      >
        <p className="font-garamond italic text-[#D4A82A] text-lg mb-4">
          from depth, not from formula.
        </p>
        <h2 className="font-fraunces text-4xl md:text-5xl text-[#F5EFE6] mb-8">
          the universe is responding.
        </h2>
        <Link
          href="/login"
          className="font-garamond inline-block px-10 py-4 border border-[#D4A82A] text-[#D4A82A] text-base hover:bg-[#D4A82A] hover:text-[#3D2E25] transition-all"
        >
          begin
        </Link>
      </motion.section>

      {/* Footer */}
      <footer className="bg-[#3A302A] px-6 py-8 text-center">
        <p className="font-garamond text-[#6B5648] text-sm">
          © 2026 sísí · <span className="italic">what you call in, you become.</span>
        </p>
      </footer>
    </main>
  );
}
