import { isLocale, type Locale } from "@/i18n/config";

export function buildLocalizedPath(pathname: string, nextLocale: Locale) {
  const segments = pathname.split("/");
  if (isLocale(segments[1] ?? "")) {
    segments[1] = nextLocale;
  } else {
    segments.splice(1, 0, nextLocale);
  }

  return segments.join("/") || `/${nextLocale}`;
}
