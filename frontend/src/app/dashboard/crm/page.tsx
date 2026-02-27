"use client";

import { Construction } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CrmPage() {
  const t = useTranslations();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <Construction className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("crm.title")}
        </h1>
        <p className="text-muted-foreground max-w-sm">
          {t("crm.underDevelopment")}
        </p>
      </div>
    </div>
  );
}
