"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UpgradeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/app"), 5000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="min-h-dvh bg-ink flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.span
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="font-caveat text-7xl text-paper/70 block mb-8"
        >
          ✦
        </motion.span>

        <h1 className="t-display text-paper mb-4">
          Welcome, love.
        </h1>
        <p className="font-garamond italic text-paper/60 leading-relaxed max-w-xs">
          You have unlocked everything. the universe has always had more for you.
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="mt-10"
        >
          <Link
            href="/app"
            className="t-body text-paper/70 border border-star/40 px-6 py-3 hover:bg-paper/10 transition-colors"
          >
            Continue to Sísí
          </Link>
        </motion.div>

        <p className="t-meta text-paper/20 mt-6">
          Redirecting in 5 seconds
        </p>
      </motion.div>
    </main>
  );
}
