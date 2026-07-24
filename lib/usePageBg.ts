"use client";

import { useEffect } from "react";

/**
 * usePageBg — 페이지가 마운트되는 동안 <body> 배경색을 지정.
 *
 * iOS Safari에서 status bar (safe area top) 뒤가 body 색으로 채워짐.
 * 페이지별로 자기 톤에 맞는 색을 설정하면 edge-to-edge 느낌.
 * PWA로 설치되면 status bar가 투명해져서 어차피 body 색이 자연스레 이어짐.
 *
 * 예:
 *   usePageBg("#F5E9C8"); // Journey 노란 하늘 톤
 *   usePageBg("#1a1737"); // My Stars 밤하늘 톤
 */
export function usePageBg(color: string) {
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = color;
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [color]);
}
