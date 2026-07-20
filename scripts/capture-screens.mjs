/**
 * capture-screens.mjs
 *
 * Playwright script — 모든 주요 화면을 모바일 + 데스크탑 뷰포트로 자동 캡쳐.
 * Portfolio case study용 스크린샷 생성.
 *
 * 실행:
 *   npm install -D playwright
 *   npx playwright install chromium
 *   node scripts/capture-screens.mjs
 *
 * 옵션:
 *   BASE_URL=https://hellosisi.co node scripts/capture-screens.mjs
 *   (기본: http://localhost:3000)
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = path.resolve(__dirname, "../screenshots");

// 캡쳐할 화면들 — 각 route + state
const SCREENS = [
  // Onboarding flow
  { name: "01-splash", path: "/", wait: 1500 },
  { name: "02-intro", path: "/intro", wait: 1500 },
  { name: "03-login", path: "/login", wait: 1200 },
  { name: "04-onboarding-name", path: "/onboarding", wait: 1200, requireGuest: true },

  // Main tabs
  { name: "10-journey-home", path: "/journey", wait: 3000 },
  { name: "11-messages-dashboard", path: "/messages", wait: 1500 },
  { name: "12-messages-chat", path: "/messages/chat", wait: 2000 },
  { name: "13-my-stars", path: "/my-stars", wait: 2000 },
  { name: "14-gallery-timeline", path: "/gallery", wait: 1500 },

  // Detail views
  { name: "20-postcard-write", path: "/moment/write", wait: 1200 },

  // Legal
  { name: "90-privacy", path: "/privacy", wait: 1000 },
  { name: "91-terms", path: "/terms", wait: 1000 },
];

// 캡쳐할 뷰포트들
const VIEWPORTS = [
  { name: "iphone-15-pro", width: 393, height: 852, deviceScaleFactor: 3 },
  { name: "iphone-se", width: 375, height: 667, deviceScaleFactor: 2 },
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 2 },
];

async function main() {
  // Output dir 준비
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`📸 Capturing screens from ${BASE_URL}`);
  console.log(`📁 Output: ${OUT_DIR}\n`);

  const browser = await chromium.launch();

  for (const viewport of VIEWPORTS) {
    console.log(`\n🖥️  Viewport: ${viewport.name} (${viewport.width}×${viewport.height})`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.name !== "desktop",
      hasTouch: viewport.name !== "desktop",
      userAgent:
        viewport.name === "desktop"
          ? undefined
          : "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    // Guest 모드 자동 세팅 (auth-required 페이지 접근 위해)
    await context.addCookies([
      {
        name: "sisi_guest",
        value: "1",
        url: BASE_URL,
      },
    ]);

    const page = await context.newPage();

    // localStorage 게스트 상태 세팅
    await page.addInitScript(() => {
      localStorage.setItem("sisi:guest", "true");
      localStorage.setItem("sisi:guest-name", "Jisoo");
      localStorage.setItem("sisi:guest-onboarded", "true");
      // Nudge 안 뜨게
      localStorage.setItem("sisi:guest-nudge-seen", "true");
    });

    for (const screen of SCREENS) {
      const url = `${BASE_URL}${screen.path}`;
      const filename = `${screen.name}--${viewport.name}.png`;
      const outPath = path.join(OUT_DIR, filename);

      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
        await page.waitForTimeout(screen.wait || 1500);

        // Video autoplay가 있으면 살짝 더 기다림 (world.mp4)
        if (screen.path === "/journey") {
          await page.waitForTimeout(2000);
        }

        await page.screenshot({
          path: outPath,
          fullPage: false, // 뷰포트만
        });
        console.log(`  ✓ ${filename}`);
      } catch (err) {
        console.log(`  ✗ ${filename} — ${err.message}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`\n✨ Done! ${SCREENS.length} × ${VIEWPORTS.length} = ${SCREENS.length * VIEWPORTS.length} screenshots`);
  console.log(`📁 Open: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
