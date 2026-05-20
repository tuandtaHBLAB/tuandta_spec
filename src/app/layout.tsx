import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: {
    default: "S-JEP スピーキング模擬試験",
    template: "%s | S-JEP スピーキング模擬試験",
  },
  description: "Next.js App Routerで構築した、SSR対応のスピーキング模擬試験デモです。",
  keywords: ["nextjs", "ssr", "seo", "app router", "typescript", "speaking test"],
  openGraph: {
    title: "S-JEP スピーキング模擬試験",
    description: "カメラ認証と不正防止モニタリングを備えたスピーキング模擬試験画面。",
    type: "website",
    url: "https://example.com",
    locale: "ja_JP",
    siteName: "S-JEP スピーキング模擬試験",
  },
  twitter: {
    card: "summary_large_image",
    title: "S-JEP スピーキング模擬試験",
    description: "カメラ認証と不正防止モニタリングを備えたスピーキング模擬試験画面。",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
