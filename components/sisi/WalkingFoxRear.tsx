"use client";

import { useId } from "react";

/**
 * WalkingFoxRear — *Rear-view animated walking fox* + *stretched sprite shadow*.
 *
 * Shadow 기법:
 *   1. 같은 fox webp를 *복제*
 *   2. SVG feColorMatrix로 *journey-navy #1F2A44* 로 recolor
 *   3. scaleY(-1)로 뒤집기
 *   4. scaleX + skewX + translateX로 *왼쪽으로 크게 stretch* → 형체 흐릿하게
 *   5. blur + 낮은 opacity + multiply blend → dusty navy shadow
 *
 * 결과: fox의 walking cycle과 sync되면서, 형체가 정확히 안 보이는
 *      *painterly dreamy shadow* — Sky Children of Light 스타일.
 */

type Props = {
  src?: string;
  size?: number;
  className?: string;
};

export function WalkingFoxRear({
  src = "/fox/walking-rear.webp",
  size = 130,
  className = "",
}: Props) {
  // Unique id per instance to avoid SVG filter conflicts
  const rawId = useId();
  const filterId = `fox-shadow-navy-${rawId.replace(/:/g, "")}`;

  return (
    <div
      className={`relative pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* SVG filter: journey-navy #1F2A44 */}
      <svg
        width="0"
        height="0"
        className="absolute pointer-events-none"
        aria-hidden
      >
        <defs>
          <filter id={filterId}>
            <feColorMatrix
              type="matrix"
              values="
                0 0 0 0 0.1216
                0 0 0 0 0.1647
                0 0 0 0 0.2667
                0 0 0 1 0
              "
            />
          </filter>
        </defs>
      </svg>

      {/* *Shadow layer* — 🎯 유저가 매뉴얼 튜닝한 값 v2 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute w-full h-full object-contain pointer-events-none"
        style={{
          top: 0,
          left: 0,
          transform:
            "rotate(-84deg) scaleY(1) scaleX(0.9) skewX(27deg) translate(-8%, 7%)",
          transformOrigin: "45% 70%",
          filter: `url(#${filterId}) blur(4px)`,
          opacity: 0.36,
          mixBlendMode: "multiply",
        }}
      />

      {/* *Actual fox* — shadow 위에 렌더링 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Sísí walking"
        className="w-full h-full object-contain relative"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src.endsWith("walking-rear.webp")) {
            img.src = "/fox/walking-rear.png";
          } else if (!img.src.endsWith("walking-clean.webp")) {
            img.src = "/fox/walking-clean.webp";
          }
        }}
      />
    </div>
  );
}
