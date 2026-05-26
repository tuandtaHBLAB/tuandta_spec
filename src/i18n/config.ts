export const locales = ["ja", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ja";

export const localeLabels: Record<Locale, { short: string; label: string; flag: string }> = {
  ja: {
    short: "JP",
    label: "Japanese",
    flag: "🇯🇵",
  },
  en: {
    short: "EN",
    label: "English",
    flag: "🇺🇸",
  },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
