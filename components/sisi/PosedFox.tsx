"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { WalkingFoxRear } from "./WalkingFoxRear";

/**
 * PosedFox — *Walking → Posed* swap 시스템.
 *
 * 핵심:
 *   - 평소: WalkingFoxRear (걷는 walking-rear.webp)
 *   - posing=true: *posed pose 중 하나로* 교체 (랜덤 선택)
 *   - 같은 위치, 같은 크기 → *눈속임처럼 자연스러운 swap*
 *   - Capture flash와 동기화: flash 시작과 동시에 swap → screenshot에 박힘
 *
 * 추가할 자산:
 *   /public/fox/posed-looking-up-1.png (이미 있음 — bg-removed)
 *   /public/fox/posed-looking-up-2.png (bg removal 대기 중)
 *   /public/fox/posed-resting.png       (bg removal 대기 중)
 *   /public/fox/posed-sitting-rear.png  (bg removal 대기 중)
 *   /public/fox/posed-sitting-front.png (사용자 추가 시)
 */

/** 사용 가능한 *posed* 이미지들 — 본인이 /foxcapture/ 에 bg-removed로 올림 */
const POSED_VARIANTS: string[] = [
  "/foxcapture/sitting-front.png", // 정면 앉아서 카메라 보는 자세 ⭐
  "/foxcapture/looking-up-1.png",  // 위 올려다 보는 wonder
  "/foxcapture/looking-up-2.png",  // 위 보는 변형
  "/foxcapture/resting-1.png",     // 눈 감고 평화로운
  "/foxcapture/resting-2.png",     // 변형
  "/foxcapture/sitting-rear.png",  // 뒷모습 앉은 자세
];

type Props = {
  /** Walking → posing swap 트리거 */
  posing: boolean;
  /** Walking fox 크기 */
  size?: number;
  /** Posed fox 크기 (보통 walking보다 살짝 작음 — 앉으면 작아 보임) */
  posedSize?: number;
  /** 외부에서 *어떤 pose 보여줄지* 제어. 안 주면 mount 시 랜덤 선택 */
  poseSrc?: string;
};

export function PosedFox({
  posing,
  size = 180,
  posedSize = 170,
  poseSrc,
}: Props) {
  // Mount 시 *랜덤 pose 선택* — 매번 capture마다 다른 fox 자세
  const [randomPose, setRandomPose] = useState<string>(POSED_VARIANTS[0]);
  useEffect(() => {
    const idx = Math.floor(Math.random() * POSED_VARIANTS.length);
    setRandomPose(POSED_VARIANTS[idx]);
  }, []);

  const finalPoseSrc = poseSrc ?? randomPose;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <AnimatePresence mode="sync">
        {!posing && (
          <motion.div
            key="walking"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }} // 거의 즉시 (flash로 가려짐)
            className="absolute inset-0"
          >
            <WalkingFoxRear size={size} />
          </motion.div>
        )}
        {posing && (
          <motion.div
            key="posed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }} // 거의 즉시 — flash 시작과 함께
            className="absolute inset-0 flex items-end justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={finalPoseSrc}
              alt="Sísí posed"
              style={{
                width: posedSize,
                height: posedSize,
                objectFit: "contain",
                objectPosition: "bottom",
              }}
              onError={(e) => {
                // 폴백: 첫번째 사용 가능한 pose로
                const img = e.currentTarget;
                if (img.src.endsWith(finalPoseSrc)) {
                  img.src = POSED_VARIANTS[0];
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
