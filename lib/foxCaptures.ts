/**
 * foxCaptures — Sísí *photo capture* 모먼트 모음.
 *
 * 사용자가 camera FAB 누르면 *이 중 랜덤 한 장*이 *그날의 captured moment*가 됨.
 * Postcard로 저장되면 *영원히 그 fox 포즈*가 그 순간의 기억.
 *
 * 다양한 포즈로 *각각의 모먼트가 unique*하게 느껴짐 — collection 만드는 재미.
 */

export type FoxCapture = {
  /** Stable id — postcard 저장에 사용 */
  id: string;
  /** Image path */
  src: string;
  /** 모먼트 분위기 (선택적, 향후 prompt나 caption에 사용 가능) */
  mood?: string;
};

export const FOX_CAPTURES: FoxCapture[] = [
  { id: "scenery",       src: "/foxcapture/scenery.png",       mood: "mystical" },
  { id: "resting-1",     src: "/foxcapture/resting-1.png",     mood: "peaceful" },
  { id: "resting-2",     src: "/foxcapture/resting-2.png",     mood: "peaceful" },
  { id: "looking-up-1",  src: "/foxcapture/looking-up-1.png",  mood: "wonder" },
  { id: "looking-up-2",  src: "/foxcapture/looking-up-2.png",  mood: "wonder" },
  { id: "sitting-front", src: "/foxcapture/sitting-front.png", mood: "present" },
  { id: "sitting-rear",  src: "/foxcapture/sitting-rear.png",  mood: "watchful" },
];

/**
 * 랜덤 fox capture 선택 — *seed 옵션*으로 *같은 세션에서 일관된 선택* 유지 가능
 */
export function pickRandomCapture(seed?: string): FoxCapture {
  if (seed !== undefined) {
    // Deterministic — hash seed → index
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % FOX_CAPTURES.length;
    return FOX_CAPTURES[idx];
  }
  const idx = Math.floor(Math.random() * FOX_CAPTURES.length);
  return FOX_CAPTURES[idx];
}

/**
 * id로 capture 찾기 — URL param / postcard 저장 데이터에서 복원할 때
 */
export function getCaptureById(id: string): FoxCapture | undefined {
  return FOX_CAPTURES.find((c) => c.id === id);
}
