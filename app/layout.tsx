import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/design-system/tokens.css";
import "@/design-system/typography.css";
import "@/design-system/motion.css";
import "./globals.css";
import "@/components/ds/ds.css";
import ServiceWorkerRegister from "@/components/sisi/ServiceWorkerRegister";
import { BackgroundMusic } from "@/components/sisi/BackgroundMusic";
import { EffectsHost } from "@/components/sisi/effects/EffectsHost";
import { DevKeyboard } from "@/components/sisi/DevKeyboard";
import { CloudSave } from "@/components/sisi/CloudSave";
import { UndoDelete } from "@/components/sisi/UndoDelete";

// Inter — functional metadata only (dates, statuses, helpers, chips).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Sentient — self-hosted WOFF2 (design-system/typography.css).

export const metadata: Metadata = {
  title: "sísí — manifest with sísí.",
  description: "what is meant for you is on its way.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "sísí",
    startupImage: [
      // iPhone 14 Pro Max / 15 Plus / 16 Plus — 1290x2796
      {
        url: "/icons/splash-1290x2796.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14 Pro / 15 / 15 Pro / 16 — 1179x2556
      {
        url: "/icons/splash-1179x2556.png",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 12 / 13 / 14 — 1170x2532
      {
        url: "/icons/splash-1170x2532.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone SE (2/3) — 750x1334
      {
        url: "/icons/splash-750x1334.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  openGraph: {
    title: "sísí",
    description: "a quiet walk with your inner companion.",
    siteName: "sísí",
    images: ["/icons/icon-512.png?v=2"],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "var(--sisi-paper)" },
    { media: "(prefers-color-scheme: dark)", color: "var(--sisi-ink)" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={inter.variable}
    >
      <head>
        {/* Viewport — 기본 설정. interactive-widget 안 씀 (svh를 shrink시켜서
            flex 레이아웃이 keyboard로 뭉개짐). Fixed positioning으로 배경 관리. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* Sentient — self-hosted; the two weights every screen uses load first */}
        <link rel="preload" href="/fonts/sentient/Sentient-Light.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="bg-paper overflow-x-hidden">
        <ServiceWorkerRegister />
        <BackgroundMusic />
        {/* Phone-frame — 데스크탑에서만 폰 크기 constraint.
             - 모바일 (< 500px): 그냥 full width, transform 없음 (iOS 터치 이벤트 안전)
             - 데스크탑 (>= 500px): 430px 중앙, transform으로 fixed 요소들도 wrapper 안에 갇힘
             이렇게 media query로 나눠야 모바일에서 nav/버튼 터치 정상 작동.
             모바일에선 bg 투명 → 각 페이지가 body 색으로 safe area 채움. */}
        <div className="phone-frame relative mx-auto min-h-dvh w-full max-w-[430px] md:bg-paper md:shadow-[0_0_80px_rgba(16,45,50,0.15)]">
          {children}
          {/* Overlays (modals, paper sheets, toasts) render here: outside every
              transformed world container, inside the phone frame on desktop. */}
          <div id="sisi-overlay-root" />
          <EffectsHost />
          <UndoDelete />
          {/* development only, on a computer: an iPhone-sized test keyboard */}
          <DevKeyboard />
          <CloudSave />
        </div>
        <style>{`
          @media (min-width: 500px) {
            .phone-frame {
              transform: translate(0);
            }
          }
        `}</style>
      </body>
    </html>
  );
}
