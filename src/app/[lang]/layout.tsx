import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, locales } from "@/i18n/config";
import "../globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dictionary = getDictionary(lang);

  return {
    metadataBase: new URL("https://example.com"),
    title: {
      default: dictionary.metadata.title,
      template: dictionary.metadata.titleTemplate,
    },
    description: dictionary.metadata.description,
    keywords: ["nextjs", "ssr", "seo", "app router", "typescript", "speaking test"],
    openGraph: {
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
      type: "website",
      url: `https://example.com/${lang}`,
      locale: dictionary.metadata.openGraphLocale,
      siteName: dictionary.metadata.title,
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
    },
    alternates: {
      canonical: `/${lang}`,
      languages: {
        ja: "/ja",
        en: "/en",
      },
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
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang} className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
