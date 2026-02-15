"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold">{t("common.error")}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {error.message || t("common.errorOccurred")}
      </p>
      <Button onClick={reset}>{t("auth.tryAgain")}</Button>
    </div>
  );
}
