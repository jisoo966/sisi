"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** /intro — the beginning now happens in the Journey itself (see app/journey: "first"). */
export default function IntroPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return <main style={{ minHeight: "100dvh", background: "var(--sisi-paper)" }} />;
}
