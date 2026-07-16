"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

/**
 * PostcardOptionsSheet — postcard 저장 방식 선택 bottom sheet.
 *
 * 2가지 옵션:
 *   1. Add a photo         — 폰 카메라/라이브러리 (iOS native picker가 알아서 처리)
 *   2. Keep this journey scene — 기존 fox scene 캡쳐 (sísí 세계관 유지)
 *
 * Sheet는 옵션만 담당. 사진 선택 후엔 sessionStorage에 저장하고
 * /moment/write full-page로 이동 (몰입감 있는 reflection 공간).
 */

const PENDING_KEY = "sisi:pending-postcard";

export function PostcardOptionsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  // 하나의 file input — iOS Safari가 native picker로 카메라/라이브러리/파일 다 보여줌.
  const photoInputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setError("");
    setProcessing(false);
    onClose();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataURL = reader.result as string;
      // 원본 로드 → canvas로 max 1200px 리사이즈 + JPEG q0.85 압축.
      // (localStorage 5MB 한계 + Supabase 업로드 속도)
      try {
        const compressed = await compressImage(rawDataURL, 1200, 0.85);
        // sessionStorage에 임시 저장하고 write page로 이동
        // URL로 dataURL 넘길 수 없어서 sessionStorage 사용
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({
            dataURL: compressed.dataURL,
            width: compressed.width,
            height: compressed.height,
          }),
        );
        handleClose();
        router.push("/moment/write");
      } catch (err) {
        console.error("image compression failed:", err);
        setError("couldn't load photo. try another?");
        setProcessing(false);
      }
    };
    reader.onerror = () => {
      setError("couldn't read file. try again?");
      setProcessing(false);
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be re-selected later
    e.target.value = "";
  }

  /**
   * Canvas로 이미지 리사이즈 + JPEG 압축.
   * 폰 사진 5MB → 200-500KB.
   */
  async function compressImage(
    dataURL: string,
    maxDim: number,
    quality: number,
  ): Promise<{ dataURL: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const { width: srcW, height: srcH } = img;
        const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
        const w = Math.round(srcW * scale);
        const h = Math.round(srcH * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas 2d context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve({ dataURL: out, width: w, height: h });
      };
      img.onerror = () => reject(new Error("image load failed"));
      img.src = dataURL;
    });
  }

  return (
    <>
      {/* Single hidden file input — iOS는 이걸로 카메라/라이브러리/파일 선택 시트 자동 표시 */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={handleClose}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-[#f7f2e3] shadow-2xl"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-[10px] pb-[6px]">
                <div className="h-[4px] w-[42px] rounded-full bg-journey-navy/20" />
              </div>

              <div className="px-[24px] pb-[28px]">
                {/* Header */}
                <div className="text-center mt-[6px] mb-[24px]">
                  <p className="font-sentient text-[22px] text-journey-navy leading-tight">
                    keep a moment
                  </p>
                  <p className="font-sentient italic text-[13px] text-journey-navy/60 mt-[6px]">
                    choose how you&apos;d like to save it.
                  </p>
                </div>

                {/* 2 options — iOS native picker가 camera/library/files 3선택 자동 제공 */}
                <div className="flex flex-col gap-[10px]">
                  <OptionCard
                    icon={<CameraIcon />}
                    title="add a photo"
                    subtitle="from your camera or library"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={processing}
                  />
                  <OptionCard
                    icon={<SparkIcon />}
                    title="keep this journey scene"
                    subtitle="today's walk with sísí"
                    onClick={() => {
                      handleClose();
                      router.push("/moment");
                    }}
                    disabled={processing}
                  />
                </div>

                {error && (
                  <p className="mt-4 font-sentient italic text-[13px] text-journey-oxblood text-center">
                    {error}
                  </p>
                )}

                {processing && !error && (
                  <p className="mt-4 font-sentient italic text-[13px] text-journey-navy/60 text-center">
                    preparing your photo...
                  </p>
                )}

                {/* Cancel */}
                <button
                  onClick={handleClose}
                  className="w-full mt-[16px] py-[14px] font-sentient text-[14px] text-journey-navy/50"
                >
                  cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Option card ─────────────────────────────────────── */

function OptionCard({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-[14px] w-full py-[18px] px-[18px] rounded-[16px] bg-white/70 hover:bg-white active:scale-98 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="shrink-0 text-journey-navy/70">{icon}</div>
      <div className="flex-1">
        <p className="font-sentient text-[16px] text-journey-navy leading-tight">
          {title}
        </p>
        <p className="font-sentient italic text-[12px] text-journey-navy/55 mt-[3px]">
          {subtitle}
        </p>
      </div>
      {/* Chevron for affordance */}
      <svg
        className="shrink-0 text-journey-navy/35"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </button>
  );
}

/* ─── Icons ───────────────────────────────────────────── */

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="sheet-spark" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgb(255,248,225)" />
          <stop offset="45%" stopColor="rgb(255,236,189)" />
          <stop offset="100%" stopColor="rgb(251,198,106)" />
        </radialGradient>
      </defs>
      <path
        d="M50 12 L60 42 L90 42 L66 60 L76 90 L50 72 L24 90 L34 60 L10 42 L40 42 Z"
        fill="url(#sheet-spark)"
      />
    </svg>
  );
}
