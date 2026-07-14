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
      <body>
        <ServiceWorkerRegister />
        <BackgroundMusic />
        {children}
      </body>
    </html>
  );
}
