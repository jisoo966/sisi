"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/sisi/BackButton";

export const dynamic = "force-dynamic";

type Capture = {
  dataURL: string;
  width: number;
  height: number;
  takenAt: string;
};

/**
 * /postcard — *그 순간 찍은 screenshot*을 postcard로 저장하는 폼.
 *   - sessionStorage에서 lastCapture 읽음 (captureJourneyScreenshot 결과)
 *   - "Today I felt..." 텍스트와 함께 *localStorage에 영구 저장*
 *   - 저장된 postcard는 *postcards 컬렉션*에 그대로 표시
 */
export default function PostcardPage() {
  const router = useRouter();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("sisi:lastCapture");
    if (raw) {
      try {
        const parsed: Capture = JSON.parse(raw);
        setCapture(parsed);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  function save() {
    if (!capture) return;
    const postcards = JSON.parse(localStorage.getItem("sisi:postcards") ?? "[]");
    postcards.unshift({
      id: crypto.randomUUID(),
      text,
      image: capture.dataURL,
      width: capture.width,
      height: capture.height,
      takenAt: capture.takenAt,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("sisi:postcards", JSON.stringify(postcards));
    // sessionStorage clean up
    sessionStorage.removeItem("sisi:lastCapture");
    router.push("/postcard/saved");
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#F5F4EC]">
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="pt-[28px] px-[21px]">
          <BackButton />
        </div>

        {/* Postcard image — *방금 찍은 screenshot*. 없으면 placeholder. */}
        <div className="px-[20px] pt-[20px]">
          <div className="rounded-[20px] overflow-hidden relative w-full aspect-[353/510] shadow-md bg-journey-cream">
            {capture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capture.dataURL}
                alt="captured moment"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="font-sentient text-journey-navy/40 text-[15px]">
                  no capture found
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* "Today I felt..." input */}
        <div className="px-[21px] pb-[42px]">
          <div className="rounded-[39px] bg-white/60 backdrop-blur-md border-2 border-white px-[28px] py-[26px] shadow-sm relative min-h-[120px]">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Today I felt..."
              rows={2}
              className="font-sentient w-full bg-transparent text-[18px] text-journey-navy placeholder:text-journey-navy/40 outline-none resize-none leading-snug pr-[80px]"
            />
            <button
              onClick={save}
              disabled={!text.trim() || !capture}
              className="font-sentient absolute bottom-[14px] right-[14px] rounded-[20px] bg-journey-purple/70 hover:bg-journey-purple/90 disabled:opacity-40 text-journey-navy px-[26px] h-[49px] text-[16px] transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
