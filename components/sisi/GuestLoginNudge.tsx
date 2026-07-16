"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

/**
 * GuestLoginNudge — 게스트가 앱을 어느 정도 쓴 후 로그인 유도.
 *
 * 트리거:
 *   - Messages: 5개 메시지 보낸 후 자동으로 open
 *   - Journey home bell: 언제든 볼 수 있음 (dismiss 후에도)
 *
 * 카피: sísí voice — 요청이 아닌 제안, 이미 만든 것들 상기.
 */
export function GuestLoginNudge({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-[24px] top-1/2 -translate-y-1/2 z-50 max-w-[360px] mx-auto"
          >
            <div
              className="rounded-[24px] p-[28px] shadow-2xl text-center"
              style={{
                background:
                  "linear-gradient(180deg, rgba(35, 30, 75, 0.97) 0%, rgba(20, 17, 55, 0.98) 100%)",
                border: "1px solid rgba(255, 236, 189, 0.14)",
                boxShadow:
                  "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(177, 156, 217, 0.12)",
              }}
            >
              {/* Star icon */}
              <div className="flex justify-center mb-[18px]">
                <div
                  className="relative flex items-center justify-center"
                  style={{ width: 56, height: 56 }}
                >
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 50,
                      height: 50,
                      background:
                        "radial-gradient(circle, rgba(255,181,112,0.5), transparent 90%)",
                      filter: "blur(8px)",
                    }}
                  />
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 100 100"
                    className="relative"
                  >
                    <defs>
                      <radialGradient
                        id="nudge-star"
                        cx="50%"
                        cy="50%"
                      >
                        <stop offset="0%" stopColor="rgb(255,248,225)" />
                        <stop offset="35%" stopColor="rgb(255,236,189)" />
                        <stop offset="100%" stopColor="rgb(251,198,106)" />
                      </radialGradient>
                    </defs>
                    <path
                      d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
                      fill="url(#nudge-star)"
                    />
                  </svg>
                </div>
              </div>

              <p className="font-sentient text-[22px] text-white/95 mb-[12px] leading-tight">
                let me remember
                <br />
                your journey
              </p>
              <p className="font-sentient text-[13px] text-white/65 mb-[26px] leading-relaxed">
                log in to keep our walks, your stars, and the
                moments you&apos;ve kept — for whenever you return.
              </p>

              <div className="flex flex-col gap-[10px]">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="w-full h-[52px] rounded-full bg-[#B19CD9] backdrop-blur-md border border-white/25 text-journey-navy font-sentient text-[15px] shadow-lg hover:brightness-105 active:scale-98 flex items-center justify-center transition-all"
                >
                  log in ✦
                </Link>
                <button
                  onClick={onClose}
                  className="w-full h-[44px] font-sentient text-[14px] text-white/60 hover:text-white/85 transition"
                >
                  maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
