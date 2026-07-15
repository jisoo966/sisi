import type { Metadata } from "next";
import { Fraunces, EB_Garamond, Caveat, Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/sisi/ServiceWorkerRegister";
import { BackgroundMusic } from "@/components/sisi/BackgroundMusic";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

// Brand v2: Inter for body text (sans)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Sentient (Fontshare) loaded via <link> below — not on Google Fonts

export const metadata: Metadata = {
  title: "sísí — manifest with sísí.",
  description: "what is meant for you is on its way.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "sísí",
  },
  openGraph: {
    title: "sísí",
    description: "what is meant for you is on its way.",
    siteName: "sísí",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${ebGaramond.variable} ${caveat.variable} ${inter.variable}`}
    >
      <head>
        {/* Sentient — Fontshare (brand v2 heading font) */}
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin=""
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=sentient@200,300,400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#e8e0cf] overflow-x-hidden">
        <ServiceWorkerRegister />
        <BackgroundMusic />
        {/* Phone-frame — mobile-first 앱은 데스크탑에서도 폰 크기로만 렌더.
             - 모바일: max-w가 뷰포트보다 크면 무시됨 → full width
             - 데스크탑: 430px 중앙, 양옆 neutral 크림 색상 노출
             - transform:translate(0) — 자식의 position:fixed를
               뷰포트가 아니라 이 wrapper 기준으로 constraint되게 함
               (BottomNav, 모달, 시트 등이 폰 프레임 안에 갇혀서 좋게 보임) */}
        <div
          className="relative mx-auto min-h-screen w-full max-w-[430px] bg-[#f7f2e3] shadow-[0_0_80px_rgba(0,0,0,0.15)]"
          style={{ transform: "translate(0)" }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
