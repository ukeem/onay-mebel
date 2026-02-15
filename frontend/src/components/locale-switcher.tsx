"use client";

import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = locale === "ru" ? "kz" : "ru";
    document.cookie = `locale=${next};path=/;max-age=${365 * 24 * 60 * 60}`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={isPending}
      className="text-xs font-medium"
    >
      {locale === "ru" ? t("kz") : t("ru")}
    </Button>
  );
}
