"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JourneyScene } from "@/components/sisi/JourneyScene";
import { PosedFox } from "@/components/sisi/PosedFox";
import { BackButton } from "@/components/sisi/BackButton";
import { captureJourneyScreenshot } from "@/lib/captureScreenshot";
import { savePostcard } from "@/lib/postcards";

export const dynamic = "force-dynamic";

type Phase = "viewfinder" | "captured";

type Capture = {
  dataURL: string;
  width: number;
  height: number;
  takenAt: string;
};

/**
 * /moment — *원페이지 capture 플로우*.
 *
 * Phase 1 (viewfinder):
 *   - Live journey scene + walking fox + viewfinder brackets
 *   - "Would you like to keep this moment?" card
 *
 * Phase 2 (captured):
 *   - 방금 찍은 screenshot이 fullscreen 배경
 *   - "Today I felt..." text input
 *   - Done → /postcard/saved로 저장
 *
 * 전환은 *flash 동안에 즉시* — navigation 없음, 빠르고 매끄러움.
 */
export default function MomentPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("viewfinder");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [posing, setPosing] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [text, setText] = useState("");

  async function takePhoto() {
    if (capturing) return;
    setCapturing(true);

    // Flash 시작
    setFlashing(true);

    // Flash가 *peak 흰색*에 도달 — 150ms
    await new Promise((r) => setTimeout(r, 150));

    // 완전 하얀 동안 *walking → posed* swap
    setPosing(true);

    // Posed fox paint 대기
    await new Promise((r) => setTimeout(r, 80));

    // Screenshot 찍기 (flash 여전히 peak)
    try {
      const result = await captureJourneyScreenshot();
      setCapture(result);
      // *즉시* captured phase로 전환 — flash 페이드 동안 captured view가 자연스럽게 드러남
      setPhase("captured");
    } catch (err) {
      console.error("Screenshot failed", err);
      // 실패 시 viewfinder로 복귀
      setFlashing(false);
      setPosing(false);
      setCapturing(false);
      return;
    }

    // Flash가 천천히 사라지면서 captured view 드러남
    await new Promise((r) => setTimeout(r, 300));
    setFlashing(false);
    setCapturing(false);
  }

  async function save() {
    if (!capture) return;
    try {
      await savePostcard({
        text,
        imageDataURL: capture.dataURL,
        width: capture.width,
        height: capture.height,
        takenAt: capture.takenAt,
      });
      router.push("/postcard/saved");
    } catch (err) {
      console.error("savePostcard failed:", err);
      // 실패해도 사용자에게 알리고 saved 페이지로 (localStorage fallback으로 저장되었을 것)
      router.push("/postcard/saved");
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#F5F4EC]">
      {/* Phase 1: VIEWFINDER */}
      {phase === "viewfinder" && (
        <>
          <JourneyScene />
          <div className="absolute bottom-[210px] left-1/2 -translate-x-1/2 z-[5]">
            <motion.div
              className="relative"
              animate={{ x: [0, 8, 0, -6, 0, 5, 0] }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <PosedFox posing={posing} size={180} posedSize={180} />
            </motion.div>
          </div>

          {/* Viewfinder brackets */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute left-[12%] top-[33%] h-[60px] w-[60px] border-l-[3px] border-t-[3px] border-white/95 rounded-tl-[10px]" />
            <div className="absolute right-[12%] top-[33%] h-[60px] w-[60px] border-r-[3px] border-t-[3px] border-white/95 rounded-tr-[10px]" />
            <div className="absolute left-[12%] bottom-[36%] h-[60px] w-[60px] border-l-[3px] border-b-[3px] border-white/95 rounded-bl-[10px]" />
            <div className="absolute right-[12%] bottom-[36%] h-[60px] w-[60px] border-r-[3px] border-b-[3px] border-white/95 rounded-br-[10px]" />
          </div>

          <div className="relative z-20 flex h-screen flex-col">
            <div className="pt-[28px] px-[21px]">
              <BackButton />
            </div>

            <div className="flex-1" />

            <div className="px-[21px] pb-[42px]">
              <div className="rounded-[39px] bg-white/60 backdrop-blur-md border-2 border-white px-[28px] py-[30px] shadow-sm flex items-center gap-4">
                <p className="font-sentient flex-1 text-[20px] leading-[1.3] text-journey-navy">
                  Would you like to keep
                  <br />
                  this moment?
                </p>
                <button
                  onClick={takePhoto}
                  disabled={capturing}
                  aria-label="capture moment"
                  className="h-[51px] w-[51px] flex items-center justify-center rounded-full bg-journey-purple/60 backdrop-blur-sm border border-white/50 text-journey-navy shrink-0 hover:bg-journey-purple/80 active:scale-95 transition disabled:opacity-50"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Phase 2: CAPTURED — *Polaroid 사진 카드* + 분리된 Done 버튼. */}
      {phase === "captured" && capture && (
        <>
          {/* Soft cream background */}
          <div className="absolute inset-0 bg-[#F5F4EC]" />

          <div className="relative z-20 flex min-h-screen flex-col">
            {/* Back button — 넉넉한 top space */}
            <div className="pt-[24px] px-[24px]">
              <BackButton />
            </div>

            {/* *Polaroid 사진 카드* — 흰 태두리 + 사진 inset */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="px-[24px] pt-[20px]"
            >
              {/* Outer white matte — Polaroid 흰 태두리 */}
              <div
                className="rounded-[18px] bg-white p-[12px] pb-[16px]"
                style={{
                  boxShadow:
                    "0 12px 32px rgba(31,42,68,0.12), 0 2px 8px rgba(31,42,68,0.06)",
                }}
              >
                {/* Inner rounded photo */}
                <div className="rounded-[10px] overflow-hidden relative w-full aspect-[353/470] bg-journey-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capture.dataURL}
                    alt="captured moment"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>

            {/* Spacer — 자연스러운 breathing room */}
            <div className="flex-1 min-h-[20px]" />

            {/* Text input + Done 버튼 — Figma 16-10처럼 *한 카드 안에* */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
              className="px-[24px] pb-[36px]"
            >
              <div className="rounded-[28px] bg-white/70 backdrop-blur-md border border-white/70 px-[24px] py-[22px] shadow-sm min-h-[130px] relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Today I felt..."
                  rows={2}
                  autoFocus
                  className="font-sentient w-full bg-transparent text-[17px] text-journey-navy placeholder:text-journey-navy/40 outline-none resize-none leading-snug pr-[100px]"
                />
                {/* *Done 버튼* — input card 안, 우하단, z-30로 위 layer */}
                <button
                  onClick={save}
                  className="font-sentient absolute bottom-[14px] right-[14px] z-30 rounded-[22px] bg-[#B19CD9] text-journey-navy px-[30px] h-[46px] text-[16px] active:scale-95 hover:brightness-105 transition-all duration-150"
                  style={{
                    boxShadow:
                      "0 6px 16px rgba(177,156,217,0.45), 0 2px 6px rgba(31,42,68,0.1)",
                  }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* Camera flash overlay — phase 전환 동안 swap 가려줌 */}
      <AnimatePresence>
        {flashing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              times: [0, 0.18, 0.55, 1],
              ease: "easeOut",
            }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </main>
  );
}
