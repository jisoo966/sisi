"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { savePostcard } from "@/lib/postcards";

/**
 * PostcardOptionsSheet — 3-way postcard creation flow.
 *
 * Journey home의 "Make a postcard" FAB이 열음. 3가지 방식:
 *   1. Take a photo          — 폰 카메라 즉시 (real photo journaling)
 *   2. Choose from gallery   — 폰 갤러리 (past moments)
 *   3. Keep this walk        — 기존 fox scene 캡쳐 (sísí 세계관 유지)
 *
 * Phases:
 *   - options   → 3개 옵션 노출
 *   - preview   → 유저 사진 선택 후 미리보기 + optional caption
 *   - uploading → 저장 중 spinner
 */

type Phase = "options" | "preview" | "uploading";

export function PostcardOptionsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("options");
  const [photoDataURL, setPhotoDataURL] = useState<string | null>(null);
  const [photoDims, setPhotoDims] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPhase("options");
    setPhotoDataURL(null);
    setPhotoDims(null);
    setCaption("");
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataURL = reader.result as string;
      // 이미지 사이즈 계산 (postcard 저장 시 width/height 필요)
      const img = new window.Image();
      img.onload = () => {
        setPhotoDataURL(dataURL);
        setPhotoDims({ w: img.width, h: img.height });
        setPhase("preview");
      };
      img.src = dataURL;
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be re-selected later
    e.target.value = "";
  }

  async function handleSave() {
    if (!photoDataURL || !photoDims) return;
    setPhase("uploading");
    setError("");

    try {
      await savePostcard({
        text: caption.trim(),
        imageDataURL: photoDataURL,
        width: photoDims.w,
        height: photoDims.h,
        takenAt: new Date().toISOString(),
      });
      // 저장 완료 화면으로
      handleClose();
      router.push("/postcard/saved");
    } catch (err) {
      console.error("Save postcard failed:", err);
      setError("save failed. try again?");
      setPhase("preview");
    }
  }

  return (
    <>
      {/* Hidden file inputs — 옵션 클릭 시 trigger */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={galleryInputRef}
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
              style={{ maxHeight: "88svh" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-[10px] pb-[6px]">
                <div className="h-[4px] w-[42px] rounded-full bg-journey-navy/20" />
              </div>

              <AnimatePresence mode="wait">
                {phase === "options" && (
                  <OptionsView
                    key="options"
                    onTakePhoto={() => cameraInputRef.current?.click()}
                    onChooseGallery={() => galleryInputRef.current?.click()}
                    onKeepWalk={() => {
                      handleClose();
                      router.push("/moment");
                    }}
                    onCancel={handleClose}
                  />
                )}
                {phase === "preview" && photoDataURL && (
                  <PreviewView
                    key="preview"
                    photoDataURL={photoDataURL}
                    caption={caption}
                    onCaptionChange={setCaption}
                    onBack={() => setPhase("options")}
                    onSave={handleSave}
                    error={error}
                  />
                )}
                {phase === "uploading" && photoDataURL && (
                  <UploadingView key="uploading" photoDataURL={photoDataURL} />
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Phase views ────────────────────────────────────── */

function OptionsView({
  onTakePhoto,
  onChooseGallery,
  onKeepWalk,
  onCancel,
}: {
  onTakePhoto: () => void;
  onChooseGallery: () => void;
  onKeepWalk: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="px-[24px] pb-[28px]"
    >
      {/* Header */}
      <div className="text-center mt-[6px] mb-[24px]">
        <p className="font-sentient text-[22px] text-journey-navy leading-tight">
          make a postcard
        </p>
        <p className="font-sentient italic text-[13px] text-journey-navy/60 mt-[6px]">
          what stayed with you?
        </p>
      </div>

      {/* 3 options */}
      <div className="flex flex-col gap-[10px]">
        <OptionCard
          icon={<CameraIcon />}
          title="take a photo"
          subtitle="capture this moment"
          onClick={onTakePhoto}
        />
        <OptionCard
          icon={<GalleryIcon />}
          title="choose from gallery"
          subtitle="something from before"
          onClick={onChooseGallery}
        />
        <OptionCard
          icon={<SparkIcon />}
          title="keep this walk"
          subtitle="today's scene with sísí"
          onClick={onKeepWalk}
        />
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="w-full mt-[16px] py-[14px] font-sentient text-[14px] text-journey-navy/50"
      >
        cancel
      </button>
    </motion.div>
  );
}

function PreviewView({
  photoDataURL,
  caption,
  onCaptionChange,
  onBack,
  onSave,
  error,
}: {
  photoDataURL: string;
  caption: string;
  onCaptionChange: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
  error: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="px-[24px] pb-[28px]"
    >
      {/* Header — back + title */}
      <div className="flex items-center justify-between mb-[16px]">
        <button
          onClick={onBack}
          aria-label="back"
          className="h-9 w-9 flex items-center justify-center rounded-full bg-journey-navy/8 text-journey-navy/70 hover:bg-journey-navy/15 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className="font-sentient text-[15px] text-journey-navy">preview</p>
        <span className="w-9" />
      </div>

      {/* Photo preview — polaroid style */}
      <div className="relative w-full max-w-[280px] mx-auto mb-[18px]">
        <div className="bg-white rounded-[8px] p-[8px] pb-[12px] shadow-lg">
          <div className="relative rounded-[4px] overflow-hidden aspect-square bg-journey-navy/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoDataURL}
              alt="preview"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Caption */}
      <textarea
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value.slice(0, 200))}
        placeholder="what stayed with you here?"
        rows={2}
        className="font-sentient w-full bg-transparent border-b border-journey-navy/20 focus:border-journey-navy/60 outline-none py-2 text-[15px] text-journey-navy placeholder:text-journey-navy/40 resize-none leading-snug transition-colors"
      />
      <p className="text-[10px] font-mono text-journey-navy/40 text-right mt-1">
        {caption.length}/200
      </p>

      {error && (
        <p className="mt-2 font-sentient italic text-[12px] text-journey-oxblood text-center">
          {error}
        </p>
      )}

      {/* Save button */}
      <button
        onClick={onSave}
        className="w-full mt-[18px] h-[52px] rounded-full bg-journey-purple text-journey-navy font-sentient text-[15px] shadow-lg hover:brightness-105 active:scale-98 transition-all"
      >
        keep this postcard ✦
      </button>
    </motion.div>
  );
}

function UploadingView({ photoDataURL }: { photoDataURL: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="px-[24px] pb-[36px]"
    >
      <div className="relative w-full max-w-[220px] mx-auto mb-[24px]">
        <div className="bg-white rounded-[8px] p-[8px] pb-[12px] shadow-lg opacity-60">
          <div className="relative rounded-[4px] overflow-hidden aspect-square bg-journey-navy/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoDataURL} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
      <p className="font-sentient italic text-[15px] text-journey-navy/70 text-center">
        saving your postcard...
      </p>
      <div className="flex justify-center gap-1 mt-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
            className="inline-block h-[5px] w-[5px] rounded-full bg-journey-navy/60"
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Option card ─────────────────────────────────────── */

function OptionCard({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[16px] w-full p-[16px] rounded-[16px] bg-white/60 border border-journey-navy/8 hover:bg-white active:scale-98 transition text-left"
    >
      <div className="shrink-0 h-[42px] w-[42px] flex items-center justify-center rounded-full bg-journey-purple/25 text-journey-navy">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-sentient text-[16px] text-journey-navy leading-tight">
          {title}
        </p>
        <p className="font-sentient italic text-[12px] text-journey-navy/55 mt-[2px]">
          {subtitle}
        </p>
      </div>
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

function GalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
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

