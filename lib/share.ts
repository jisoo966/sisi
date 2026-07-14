/**
 * lib/share — Postcard 공유 헬퍼.
 *
 * Web Share API 사용 (iOS Safari, Chrome Android 지원).
 * 지원 안 되는 브라우저면 fallback:
 *   - 이미지: download
 *   - 텍스트: clipboard copy
 */

export type ShareResult = "shared" | "downloaded" | "copied" | "cancelled" | "failed";

/**
 * dataURL을 File로 변환 (Web Share API는 File[]을 받음).
 */
async function dataURLToFile(dataURL: string, name = "sisi-moment.jpg"): Promise<File> {
  const res = await fetch(dataURL);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

/**
 * Postcard 공유. 지원 순서:
 *   1. Web Share API + files (iOS Safari 이상)
 *   2. Web Share API text만 (일부 browser)
 *   3. Image download fallback
 */
export async function sharePostcard(opts: {
  imageDataURL: string;
  text?: string;
  dateStr?: string;
}): Promise<ShareResult> {
  const { imageDataURL, text, dateStr } = opts;

  const title = "A moment from Sísí";
  const message = text
    ? `"${text}"${dateStr ? `\n\n— ${dateStr}` : ""}`
    : dateStr
      ? `A moment kept — ${dateStr}`
      : "A moment kept";

  try {
    const file = await dataURLToFile(imageDataURL);

    // 1. Full share (image + text) — iOS 15+, Chrome Android
    if (
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title,
        text: message,
        files: [file],
      });
      return "shared";
    }

    // 2. Text-only share
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator.share({ title, text: message });
      return "shared";
    }

    // 3. Fallback: download image
    downloadImage(imageDataURL);
    return "downloaded";
  } catch (err) {
    const name = (err as Error).name;
    // 사용자가 native share sheet에서 취소한 경우
    if (name === "AbortError" || name === "NotAllowedError") {
      return "cancelled";
    }
    console.error("sharePostcard failed:", err);
    // 실패해도 download는 시도
    try {
      downloadImage(imageDataURL);
      return "downloaded";
    } catch {
      return "failed";
    }
  }
}

/** 이미지 다운로드 fallback */
function downloadImage(dataURL: string, filename = "sisi-moment.jpg") {
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
