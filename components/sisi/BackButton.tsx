"use client";

import { useRouter } from "next/navigation";

/**
 * BackButton — 모든 페이지 공용 back 아이콘.
 * 스타일: journey 홈 아이콘 style로 통일 (36px + frosted glass + navy 아이콘)
 */
export function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Back"
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/40 text-journey-navy/80 shadow-sm hover:bg-white/60 transition ${className}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}
