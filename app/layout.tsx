import type { Metadata } from "next";
import { Fraunces, EB_Garamond, Caveat } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/sisi/ServiceWorkerRegister";

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
      className={`${fraunces.variable} ${ebGaramond.variable} ${caveat.variable}`}
    >
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
