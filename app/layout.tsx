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
        {/* Viewport — 기본 설정. interactive-widget 안 씀 (svh를 shrink시켜서
            flex 레이아웃이 keyboard로 뭉개짐). Fixed positioning으로 배경 관리. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
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
        {/* Phone-frame — 데스크탑에서만 폰 크기 constraint.
             - 모바일 (< 500px): 그냥 full width, transform 없음 (iOS 터치 이벤트 안전)
             - 데스크탑 (>= 500px): 430px 중앙, transform으로 fixed 요소들도 wrapper 안에 갇힘
             이렇게 media query로 나눠야 모바일에서 nav/버튼 터치 정상 작동. */}
        <div className="phone-frame relative mx-auto min-h-svh w-full max-w-[430px] bg-[#f7f2e3] md:shadow-[0_0_80px_rgba(0,0,0,0.15)]">
          {children}
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
