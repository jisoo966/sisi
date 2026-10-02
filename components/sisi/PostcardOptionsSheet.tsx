"use client";

import { useRef, useState } from "react";
import { FocusPaper, IconCamera, IconChevronRight, StarGlyph, TextAction } from "@/components/ds";
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

      <FocusPaper open={open} onClose={handleClose} title="Keep a moment" titleId="pc-title">
        <p className="t-body" style={{ margin: "0 0 16px", color: "var(--ink-60)", fontStyle: "italic" }}>
          Choose how you&apos;d like to save it.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <OptionCard
            icon={<IconCamera />}
            title="Add a photo"
            subtitle="From your camera or library"
            onClick={() => photoInputRef.current?.click()}
            disabled={processing}
          />
          <OptionCard
            icon={<StarGlyph size={20} />}
            title="Keep this scene"
            subtitle="Today's walk with Sísí"
            onClick={() => {
              handleClose();
              router.push("/moment");
            }}
            disabled={processing}
          />
        </div>
        {error && <p className="ds-error" role="alert" style={{ textAlign: "center" }}>{error}</p>}
        {processing && !error && <p className="ds-helper" style={{ marginTop: 12, textAlign: "center" }}>Preparing your photo…</p>}
        <div className="ds-actions" style={{ alignItems: "center" }}>
          <TextAction onClick={handleClose}>Not now</TextAction>
        </div>
      </FocusPaper>
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
    <button type="button" onClick={onClick} disabled={disabled} className="ds-star-row" style={{ minHeight: 64 }}>
      <span style={{ flex: "none", display: "inline-flex", color: "var(--ink-80)" }}>{icon}</span>
      <span className="ds-star-row-main">
        <span className="ds-star-row-title">{title}</span>
        <span className="t-meta" style={{ color: "var(--ink-60)" }}>{subtitle}</span>
      </span>
      <IconChevronRight size={20} />
    </button>
  );
}

