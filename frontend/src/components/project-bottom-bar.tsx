"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { Calculator, History } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface ProjectBottomBarProps {
  projectId: string;
  hasProducts?: boolean;
}

export function ProjectBottomBar({
  projectId,
  hasProducts = true,
}: ProjectBottomBarProps) {
  const t = useTranslations();
  const router = useRouter();
  const [calculating, setCalculating] = useState(false);

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:bottom-0 md:left-64">
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() =>
            router.push(`/dashboard/projects/${projectId}/details`)
          }
        >
          <History className="mr-1.5 h-4 w-4" />
          {t("project.history")}
        </Button>
        <Button
          className="flex-1"
          disabled={calculating || !hasProducts}
          onClick={async () => {
            setCalculating(true);
            try {
              const { data } = await api.post(
                `/calculations/project/${projectId}/calculate`,
              );
              toast.success(t("project.calcSuccess"));
              router.push(
                `/dashboard/projects/${projectId}/details/${data.id}`,
              );
            } catch (err: unknown) {
              toast.error(getApiError(err, t("project.calcError")));
            } finally {
              setCalculating(false);
            }
          }}
        >
          {calculating ? (
            <Spinner size="sm" className="mr-1.5" />
          ) : (
            <Calculator className="mr-1.5 h-4 w-4" />
          )}
          {calculating ? t("common.calculating") : t("project.calculate")}
        </Button>
      </div>
    </div>
  );
}
