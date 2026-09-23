/**
 * capture-journey-responsive.mjs
 *
 * Journey v2 responsive verification screenshots.
 * Captures /journey at 6 target viewports (Phase 3 spec).
 *
 * Usage:
 *   node scripts/capture-journey-responsive.mjs
 *   BASE_URL=http://localhost:3000 node scripts/capture-journey-responsive.mjs
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = path.resolve(__dirname, "../screenshots/journey-v2");

const VIEWPORTS = [
  { name: "320x568-iphone-se-1st",  width: 320, height: 568 },
  { name: "375x667-iphone-se-2-3",  width: 375, height: 667 },
  { name: "390x844-iphone-12-14",   width: 390, height: 844 },
  { name: "393x852-iphone-15-16",   width: 393, height: 852 },
  { name: "430x932-iphone-plus",    width: 430, height: 932 },
  { name: "360x800-android",        width: 360, height: 800 },
  { name: "landscape-812x375",      width: 812, height: 375 },
];

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`📸 Capturing Journey v2 responsive @ ${BASE_URL}/journey`);

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`  → ${vp.name} (${vp.width}×${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    });

    // Set guest cookie so /journey doesn't redirect to /login
    await context.addCookies([
      {
        name: "sisi_guest",
        value: "1",
        domain: new URL(BASE_URL).hostname,
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 3600,
      },
    ]);

    const page = await context.newPage();

    // Prime localStorage so the guest passes onboarding gate
    await page.addInitScript(() => {
      localStorage.setItem("sisi:guest", "true");
      localStorage.setItem("sisi:guest-onboarded", "true");
      localStorage.setItem("sisi:guest-name", "friend");
    });

    try {
      await page.goto(`${BASE_URL}/journey`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      // Give the panorama + video some time to load and settle
      await page.waitForTimeout(2500);
      const out = path.join(OUT_DIR, `${vp.name}.png`);
      await page.screenshot({ path: out, fullPage: false });
      console.log(`     ✓ ${out}`);
    } catch (err) {
      console.error(`     ✗ ${vp.name} failed:`, err.message);
    }

    await context.close();
  }

  await browser.close();
  console.log("\n✅ Done. Screenshots →", OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
