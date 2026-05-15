"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PLANS } from "@/lib/stripe";

const PERKS = [
  { icon: "☽", text: "full meditation library — all categories, all lengths" },
  { icon: "◎", text: "unlimited sísí chat — no monthly cap" },
  { icon: "✦", text: "unlimited vision boards — regenerate anytime" },
  { icon: "♡", text: "angel messages — personalised daily nudges" },
  { icon: "◈", text: "goal insights — patterns, progress, depth" },
];

export default function UpgradePage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    const plan = PLANS[billing];
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: plan.priceId }),
    });
    const { url, error } = await res.json();
    if (error) { setLoading(false); return; }
    window.location.href = url;
  }

  const plan = PLANS[billing];
  const monthlyCost = billing === "annual"
    ? (plan.amount / 12 / 100).toFixed(2)
    : (plan.amount / 100).toFixed(2);

  return (
    <main className="min-h-screen bg-[#F5EFE6]">
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/app" className="font-garamond text-sm text-[#6B5648] hover:text-[#3D2E25] transition-colors">
          ← back
        </Link>
        <span className="font-fraunces text-lg text-[#3D2E25]">sísí premium</span>
        <div className="w-12" />
      </header>

      <div className="px-6 max-w-lg mx-auto pb-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center pt-6 pb-8"
        >
          <span className="font-caveat text-5xl text-[#D4A82A]">✦</span>
          <h1 className="font-fraunces text-4xl text-[#3D2E25] mt-4 mb-3">
            go deeper.
          </h1>
          <p className="font-garamond text-[#6B5648] leading-relaxed">
            everything you need to align with what is already yours.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex bg-[#FAF6F0] border border-[#3D2E25]/8 mb-6"
        >
          {(["monthly", "annual"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`flex-1 py-3 font-garamond text-sm transition-all relative ${
                billing === b
                  ? "bg-[#3D2E25] text-[#F5EFE6]"
                  : "text-[#6B5648] hover:text-[#3D2E25]"
              }`}
            >
              {b}
              {b === "annual" && billing !== "annual" && (
                <span className="ml-2 font-garamond text-xs text-[#D4A82A]">save 33%</span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Price card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="bg-[#3D2E25] p-8 mb-6 text-center"
        >
          <p className="font-garamond text-xs text-[#D4A82A]/70 uppercase tracking-widest mb-4">
            sísí premium
          </p>
          <div className="flex items-end justify-center gap-1 mb-2">
            <span className="font-garamond text-[#F5EFE6]/50 text-lg mb-1">$</span>
            <span className="font-fraunces text-6xl text-[#F5EFE6]">{monthlyCost}</span>
            <span className="font-garamond text-[#F5EFE6]/50 mb-1">/ mo</span>
          </div>
          {billing === "annual" && (
            <p className="font-garamond italic text-sm text-[#D4A82A]/80 mb-1">
              billed ${(plan.amount / 100).toFixed(0)} annually
            </p>
          )}
          <p className="font-garamond text-xs text-[#F5EFE6]/30 mt-2">
            cancel anytime
          </p>
        </motion.div>

        {/* Perks */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-3 mb-8"
        >
          {PERKS.map((perk, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.06, duration: 0.4 }}
              className="flex items-start gap-4 bg-[#FAF6F0] border border-[#3D2E25]/8 p-4"
            >
              <span className="font-caveat text-xl text-[#D4A82A] mt-0.5 shrink-0">{perk.icon}</span>
              <p className="font-garamond text-[#3D2E25] text-sm leading-relaxed">{perk.text}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <button
          onClick={startCheckout}
          disabled={loading}
          className="w-full py-4 bg-[#D4A82A] text-[#3D2E25] font-garamond text-base hover:bg-[#C49820] transition-all disabled:opacity-50"
        >
          {loading ? "opening checkout..." : "begin — it is already yours"}
        </button>

        <p className="font-garamond text-xs text-[#6B5648]/40 text-center mt-4">
          secure payment via stripe · cancel anytime
        </p>
      </div>
    </main>
  );
}
