"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { JourneyScene } from "@/components/sisi/JourneyScene";
import { PosedFox } from "@/components/sisi/PosedFox";
import { BackButton } from "@/components/sisi/BackButton";
import { captureJourneyScreenshot } from "@/lib/captureScreenshot";

export const dynamic = "force-dynamic";

const PENDING_KEY = "sisi:pending-postcard";

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
  const [flashing, setFlashing] = useState(false);
  const [posing, setPosing] = useState(false);
  const [capturing, setCapturing] = useState(false);

  async function takePhoto() {
    if (capturing) return;
    setCapturing(true);

    // Flash 시작
    setFlashing(true);

    // Flash가 *peak 흰색*에 도달 — 150ms
    await new Promise((r) => setTimeout(r, 150));

    // 완전 하얀 동안 *walking → posed* swap
    setPosing(true);

    // Posed fox 이미지가 실제로 디코드될 때까지 대기 (PosedFox가 mount 시
    // 미리 fetch해두지만, decode는 paint 직전에 끝나는 경우가 많음 — 고정
    // 80ms만 기다리면 captureJourneyScreenshot이 naturalWidth=0인 이미지를
    // 그리려다 실패해서 사진에 여우가 안 나오는 경우가 있었음).
    // 최악의 경우(느린 네트워크로 아직 fetch도 안 끝남)를 대비해 600ms
    // 타임아웃을 둠 — 그래도 실패하면 captureJourneyScreenshot의 fallback
    // 처리(background만이라도 찍힘)로 넘어감.
    await new Promise<void>((resolve) => {
      const img = document.querySelector(
        'img[alt="Sísí posed"]',
      ) as HTMLImageElement | null;
      if (!img) {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 600);
      img
        .decode()
        .catch(() => {
          /* decode failed — still try the capture, drawImage's own
             try/catch in captureJourneyScreenshot handles it */
        })
        .finally(() => {
          clearTimeout(timeout);
          resolve();
        });
    });

    // Screenshot 찍기 → sessionStorage에 저장 → /moment/write로 이동.
    // photo upload flow와 100% 같은 write UI 사용해서 통일감 유지.
    try {
      const result = await captureJourneyScreenshot();
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          dataURL: result.dataURL,
          width: result.width,
          height: result.height,
        }),
      );
      // Flash 살짝 유지하면서 라우팅 (부드럽게)
      await new Promise((r) => setTimeout(r, 200));
      router.push("/moment/write");
    } catch (err) {
      console.error("Screenshot failed", err);
      setFlashing(false);
      setPosing(false);
      setCapturing(false);
    }
  }

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-[#F5F4EC]">
      {/* Viewfinder — 캡쳐 후 /moment/write로 이동 (통일된 write UI 사용) */}
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

          <div className="relative z-20 flex h-svh flex-col">
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

      {/* Camera flash — 진짜 카메라처럼 한 번만 팟! (Framer 없이 순수 CSS로 double-fire 방지) */}
      {flashing && (
        <div
          key="camera-flash"
          className="absolute inset-0 bg-white z-50 pointer-events-none"
          style={{
            animation: "camera-flash 0.7s ease-out forwards",
          }}
        />
      )}
      <style jsx global>{`
        @keyframes camera-flash {
          0% {
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}
