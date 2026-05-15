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
    <main className="min-h-screen bg-[#3D2E25] flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.span
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="font-caveat text-7xl text-[#D4A82A] block mb-8"
        >
          ✦
        </motion.span>

        <h1 className="font-fraunces text-4xl text-[#F5EFE6] mb-4">
          welcome, love.
        </h1>
        <p className="font-garamond italic text-[#F5EFE6]/60 leading-relaxed max-w-xs">
          you have unlocked everything. the universe has always had more for you.
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="mt-10"
        >
          <Link
            href="/app"
            className="font-garamond text-sm text-[#D4A82A] border border-[#D4A82A]/40 px-6 py-3 hover:bg-[#D4A82A]/10 transition-colors"
          >
            continue to sísí
          </Link>
        </motion.div>

        <p className="font-garamond text-xs text-[#F5EFE6]/20 mt-6">
          redirecting in 5 seconds
        </p>
      </motion.div>
    </main>
  );
}
