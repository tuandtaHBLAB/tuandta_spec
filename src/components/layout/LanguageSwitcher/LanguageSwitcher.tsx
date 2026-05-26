"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "@/components/features/exam/Exam.module.css";
import { buildLocalizedPath } from "@/helpers";
import { getDictionary } from "@/i18n/dictionaries";
import { localeLabels, locales, type Locale } from "@/i18n/config";

type LanguageSwitcherProps = {
  locale: Locale;
};

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dictionary = getDictionary(locale);

  const switchLocale = (nextLocale: Locale) => {
    router.push(buildLocalizedPath(pathname, nextLocale));
  };

  return (
    <div className={styles.languageSwitcher} aria-label={dictionary.languageSwitcher.ariaLabel}>
      {locales.map((item) => {
        const label = localeLabels[item];
        return (
          <button
            key={item}
            type="button"
            className={`${styles.languageButton} ${item === locale ? styles.languageButtonActive : ""}`}
            onClick={() => switchLocale(item)}
            aria-pressed={item === locale}
            title={label.label}
          >
            <span aria-hidden>{label.flag}</span>
            <span>{label.short}</span>
          </button>
        );
      })}
    </div>
  );
}
