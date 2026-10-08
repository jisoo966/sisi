"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePageBg } from "@/lib/usePageBg";

/**
 * / — straight into the meadow. The first time, the Journey itself is the
 * beginning (Sísí says hello there); after that, you simply walk on.
 */
export default function Home() {
  usePageBg("var(--sisi-paper)");
  const router = useRouter();
  useEffect(() => {
    // begin as a guest on this device (keeping it safe on every device comes later)
    if (!document.cookie.includes("sisi_guest=1")) document.cookie = `sisi_guest=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    localStorage.setItem("sisi:guest", "true");
    router.replace("/journey");
  }, [router]);
  return <main style={{ minHeight: "100dvh", background: "var(--sisi-paper)" }} />;
}
