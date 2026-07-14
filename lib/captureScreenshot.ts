/**
 * captureScreenshot — *현재 journey scene을 실제로 screenshot*.
 *
 * Canvas drawImage으로 *visible 비디오 frame + walking fox sprite*를 합성.
 * 결과: JPEG dataURL로 *진짜 그 순간의 모습*이 박힘.
 *
 * 한계:
 *   - 같은 origin의 video/img만 그릴 수 있음 (CORS) — public/ 안의 자산이라 OK
 *   - 결과 크기: 800x1700 @ quality 0.7 ≈ ~150KB (localStorage 친화적)
 */

export type CaptureResult = {
  dataURL: string;
  width: number;
  height: number;
  takenAt: string; // ISO timestamp
};

export async function captureJourneyScreenshot(): Promise<CaptureResult> {
  // Find DOM elements
  const video = document.querySelector("video") as HTMLVideoElement | null;
  // Posed fox 먼저 (있으면 = posing 상태). 없으면 walking fox로 fallback.
  const fox = (document.querySelector('img[alt="Sísí posed"]') ??
    document.querySelector('img[alt="Sísí walking"]')) as HTMLImageElement | null;

  // 화면 크기 (mobile portrait 기준)
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // *Retina-friendly 화질* — 1.5x viewport (DPR 고려하되 localStorage 친화적).
  // 800-1300px range = 깔끔하면서 100-400KB JPEG 사이즈
  const outputScale = 1.5;
  const outW = Math.round(screenW * outputScale);
  const outH = Math.round(screenH * outputScale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // 보간 품질 *최고로*
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Background fill — fallback
  ctx.fillStyle = "#F5F4EC";
  ctx.fillRect(0, 0, outW, outH);

  // Draw video frame with *object-cover* logic
  if (video && video.readyState >= 2 && video.videoWidth > 0) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const vRatio = vw / vh;
    const sRatio = screenW / screenH;

    let drawW: number, drawH: number, drawX: number, drawY: number;
    if (vRatio > sRatio) {
      // Video wider than screen — fit by height, crop sides
      drawH = outH;
      drawW = outH * vRatio;
      drawX = (outW - drawW) / 2;
      drawY = 0;
    } else {
      // Video taller than screen — fit by width, crop top/bottom
      drawW = outW;
      drawH = outW / vRatio;
      drawX = 0;
      drawY = (outH - drawH) / 2;
    }
    try {
      ctx.drawImage(video, drawX, drawY, drawW, drawH);
    } catch (err) {
      console.warn("video draw failed", err);
    }
  }

  // Draw fox — *aspect ratio 절대 유지*.
  // CSS의 object-fit: contain은 canvas가 무시하므로 여기서 수동으로 계산.
  if (fox) {
    const rect = fox.getBoundingClientRect();
    const containerX = rect.left * outputScale;
    const containerY = rect.top * outputScale;
    const containerW = rect.width * outputScale;
    const containerH = rect.height * outputScale;

    // 원본 fox 이미지의 naturalWidth/Height (실제 pixel 크기)
    const nw = fox.naturalWidth || 0;
    const nh = fox.naturalHeight || 0;

    if (nw > 0 && nh > 0) {
      // *Object-fit: contain* 로직을 수동 계산
      const sourceAspect = nw / nh;
      const containerAspect = containerW / containerH;

      let drawW: number, drawH: number;
      if (sourceAspect > containerAspect) {
        // 원본이 더 넓음 → 컨테이너 너비에 맞추고 높이 줄임
        drawW = containerW;
        drawH = containerW / sourceAspect;
      } else {
        // 원본이 더 김 → 컨테이너 높이에 맞추고 너비 줄임
        drawH = containerH;
        drawW = containerH * sourceAspect;
      }

      // *Object-position: bottom center* — fox 발끝이 컨테이너 하단에 맞춰짐
      const drawX = containerX + (containerW - drawW) / 2;
      const drawY = containerY + (containerH - drawH);

      try {
        ctx.drawImage(fox, drawX, drawY, drawW, drawH);
      } catch (err) {
        console.warn("fox draw failed", err);
      }
    } else {
      // Fallback (naturalSize 없으면 그냥 그대로 — stretch 될 수 있음)
      try {
        ctx.drawImage(fox, containerX, containerY, containerW, containerH);
      } catch (err) {
        console.warn("fox draw fallback failed", err);
      }
    }
  }

  // *높은 quality* JPEG (0.78 → 0.88) — 화질 큰 향상, 크기는 적당히
  const dataURL = canvas.toDataURL("image/jpeg", 0.88);

  return {
    dataURL,
    width: outW,
    height: outH,
    takenAt: new Date().toISOString(),
  };
}
