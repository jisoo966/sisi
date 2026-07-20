"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * JourneyScene — *영상 기반 endless walking world* (Sky Children of Light feel).
 *
 * 핵심:
 *   - 배경은 *Midjourney/Runway tracking shot 비디오*. 카메라가 *실제로 앞으로 흐름*.
 *   - *playbackRate*로 속도 조절 — 명상 페이스
 *   - 비디오 자체에 *parallax, atmospheric depth, light particles, motion* 모두 *베이크됨*.
 *   - 여우는 *제자리 walking* + *cast shadow* — 진짜 무게감.
 *
 * 영상은 *seamless loop*. 다른 계절 영상으로 *쉽게 swap 가능* (videoSrc prop).
 */

type Props = {
  videoSrc?: string;
  /** SSR-safe poster image (영상 로드 전 보이는 정지 frame) */
  posterSrc?: string;
  /** 0.25 ~ 1.0. 기본 0.4 = 명상 페이스. 0.25가 브라우저 최소 */
  speed?: number;
};

export function JourneyScene({
  videoSrc = "/journey/world-smooth.mp4", // 48fps interpolated — 훨씬 smooth
  posterSrc = "/journey/HomeScreen.png",
  speed = 0.5, // 0.5 * 48fps = 24fps effective — smooth 명상 페이스
}: Props) {
  // 모바일 brower autoplay 정책 — muted + playsInline 필수
  // SSR/client 일치 위해 mount 후에만 video 렌더 (poster는 항상 보임)
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 영상이 로드되면 playbackRate 적용 — 천천히 흐르도록
  useEffect(() => {
    if (!mounted || !videoRef.current) return;
    const v = videoRef.current;
    v.playbackRate = speed;
    // metadata 로드 후에도 한번 더 적용 (autoplay 후 reset되는 경우 대비)
    const onLoaded = () => {
      v.playbackRate = speed;
    };
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onLoaded);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onLoaded);
    };
  }, [mounted, speed]);

  // 안전장치 — 이 비디오는 순수 배경이라 절대 멈춰있으면 안 됨.
  // iOS Safari가 어떤 이유로든(백그라운드 복귀, low power mode 등) 재생을
  // 멈추면 큰 재생 버튼 오버레이가 뜸 — 감지되는 즉시 다시 재생 시도.
  useEffect(() => {
    if (!mounted || !videoRef.current) return;
    const v = videoRef.current;
    const resume = () => {
      v.play().catch(() => {
        // 재생 실패 — poster 이미지가 그대로 보여서 최소한 깨지진 않음
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") resume();
    };
    v.addEventListener("pause", resume);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      v.removeEventListener("pause", resume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mounted]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#F5F4EC]">
      {/* Background — video가 메인. Poster는 SSR + load 전 fallback */}
      {mounted ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          loop
          muted
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          // pointer-events-none — 순수 배경 영상이라 탭 되면 안 됨.
          // iOS Safari는 <video>를 직접 탭하면 재생/일시정지 토글하는데,
          // 이 위에 다른 UI 버튼들(z-index 높은)이 떠 있어서 탭이 그
          // 버튼을 못 맞추고 비디오로 새면 갑자기 멈추고 큰 재생 버튼
          // 오버레이가 뜨는 문제가 있었음.
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      ) : (
        /* SSR fallback — 정지 이미지로 첫 paint */
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${posterSrc})` }}
        />
      )}

      {/* Soft cream vignette — UI element들이 *환경에 자연스럽게 녹아들도록*.
          상단·하단 살짝 어둡게 = depth + UI 가독성 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b from-[#F5F4EC]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[180px] bg-gradient-to-t from-[#F5F4EC]/20 to-transparent" />
      </div>
    </div>
  );
}

/**
 * FoxShadow — *Directional cast shadow* matching journey video lighting.
 *
 * Sísí journey/world.mp4 분석:
 *   - 빛이 *위쪽 + 살짝 우측*에서 옴 (golden hour sunset glow)
 *   - 따라서 그림자는 *발 밑 + 살짝 좌측으로 elongated*
 *   - Scene 안의 다른 그림자들이 *navy/purple cool tint*
 *
 * CSS radial gradient with offset center = *directional darkness*.
 * 한쪽이 더 진하고 반대쪽으로 부드럽게 fade = 진짜 빛 방향감.
 */
export function FoxShadow({
  size = 180,
  /** 그림자 가로/세로 비율 */
  elongation = 1.3,
  /** 그림자 강도 (0~1) */
  intensity = 0.55,
  /** Container 하단부터 shadow 바닥까지 offset (px) */
  groundLevel = 18,
  /** 그림자 너비를 fox 크기 대비 비율 */
  widthRatio = 0.4,
}: {
  size?: number;
  elongation?: number;
  intensity?: number;
  groundLevel?: number;
  widthRatio?: number;
}) {
  const shadowWidth = size * widthRatio * elongation;
  const shadowHeight = size * widthRatio * 0.28;

  return (
    <motion.div
      className="absolute left-1/2 pointer-events-none"
      style={{
        width: shadowWidth,
        height: shadowHeight,
        bottom: groundLevel,
        transform: "translateX(-50%)",
        // *별도 layer* — mix-blend-mode로 발밑에서만 자연스럽게 blend.
        // multiply = 배경·fox 발밑 위에 부드럽게 겹쳐 어둡게.
        mixBlendMode: "multiply",
      }}
      // Subtle walking pulse
      animate={{
        scaleX: [1, 0.94, 1, 0.94, 1],
        opacity: [intensity * 0.85, intensity, intensity * 0.85, intensity, intensity * 0.85],
      }}
      transition={{
        duration: 1.0,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* *Soft periwinkle* 그림자 — 진한 navy 아닌 dreamy pastel.
          Sky Children of Light aesthetic. 발밑에만 부드럽게 overlap. */}
      <div
        className="w-full h-full"
        style={{
          background: `radial-gradient(ellipse at 50% 30%,
            rgba(115, 125, 175, ${intensity}) 0%,
            rgba(130, 140, 185, ${intensity * 0.75}) 25%,
            rgba(150, 158, 195, ${intensity * 0.4}) 55%,
            rgba(170, 178, 205, ${intensity * 0.15}) 80%,
            transparent 100%)`,
          borderRadius: "50%",
          filter: "blur(5px)",
        }}
      />
    </motion.div>
  );
}
