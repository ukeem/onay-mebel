import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export type Locale = "ru" | "kz";
export const defaultLocale: Locale = "ru";
export const locales: Locale[] = ["ru", "kz"];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value;
  const locale: Locale = raw === "kz" || raw === "ru" ? raw : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
