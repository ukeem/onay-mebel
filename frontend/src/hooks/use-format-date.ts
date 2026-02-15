"use client";

import { useLocale } from "next-intl";

const localeMap: Record<string, string> = {
  ru: "ru-RU",
  kz: "kk-KZ",
};

/**
 * Formats a date string using the current i18n locale.
 */
export function useFormatDate() {
  const locale = useLocale();
  const dateLocale = localeMap[locale] || "ru-RU";

  return (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
    return new Date(date).toLocaleDateString(dateLocale, options);
  };
}
