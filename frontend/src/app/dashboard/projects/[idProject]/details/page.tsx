"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import api from "@/lib/api";
import {
  ArrowLeft,
  Calculator,
  ChevronRight,
  ListX,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface CalcRow {
  id: string;
  createdAt: string;
  data: {
    projectName: string;
    totals: {
      clean: number;
      cleanFull: number;
      shop: number;
      market: number;
      productsSum: number;
      workshop: { total: number };
      cleanProfit: number;
    };
    tierTotals?: Record<
      string,
      { totalForClient: number; cleanProfit: number; productsSum: number }
    >;
    rooms: { roomType: string; roomClean: number; products: unknown[] }[];
  };
}

export default function DetailsPage({
  params,
}: {
  params: Promise<{ idProject: string }>;
}) {
  const { idProject } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [calcs, setCalcs] = useState<CalcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const fetchCalcs = useCallback(async () => {
    try {
      const { data } = await api.get(`/calculations/project/${idProject}`);
      setCalcs(data);
    } catch {
      toast.error(t("details.loadError"));
    } finally {
      setLoading(false);
    }
  }, [idProject]);

  useEffect(() => {
    fetchCalcs();
  }, [fetchCalcs]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const { data } = await api.post(
        `/calculations/project/${idProject}/calculate`,
      );
      toast.success(t("details.calculated"));
      router.push(`/dashboard/projects/${idProject}/details/${data.id}`);
    } catch (err: unknown) {
      let msg = t("details.calcError");
      if (err && typeof err === "object" && "response" in err) {
        const resp = (err as { response?: { data?: { message?: string } } })
          .response;
        if (resp?.data?.message) msg = resp.data.message;
      }
      toast.error(msg);
    } finally {
      setCalculating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/calculations/${id}`);
      toast.success(t("details.deleted"));
      fetchCalcs();
    } catch {
      toast.error(t("details.deleteError"));
    } finally {
      setDeleteId(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await api.delete(`/calculations/project/${idProject}`);
      toast.success(t("details.allDeleted"));
      fetchCalcs();
    } catch {
      toast.error(t("details.deleteError"));
    } finally {
      setDeleteAllOpen(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === "kz" ? "kk-KZ" : "ru-RU").format(n) + " ₸";

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === "kz" ? "kk-KZ" : "ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="sticky top-12 md:top-0 z-20 flex items-center gap-3 bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.back")}
          onClick={() => router.push(`/dashboard/projects/${idProject}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex-1 text-lg font-semibold tracking-tight">
          {t("details.title")}
        </h1>
        {calcs.length > 0 && (
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            aria-label={t("details.deleteAll")}
            onClick={() => setDeleteAllOpen(true)}
          >
            <ListX className="h-4 w-4" />
          </Button>
        )}
      </div>

      {calcs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Calculator className="h-10 w-10" />
          <p>{t("details.empty")}</p>
          <p className="text-sm">{t("details.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {calcs.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border px-4 py-3 cursor-pointer transition-colors hover:bg-accent"
              onClick={() =>
                router.push(`/dashboard/projects/${idProject}/details/${c.id}`)
              }
            >
              {/* Top row: date + actions */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{fmtDate(c.createdAt)}</p>
                <div className="flex items-center gap-1">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.delete")}
                      onClick={() => setDeleteId(c.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </div>
              {/* Bottom row: 3 tiers */}
              <div className="mt-2 grid grid-cols-3 gap-2 justify-between text-sm">
                {(["standard", "comfort", "premium"] as const).map((tier) => {
                  const tt = c.data.tierTotals?.[tier];
                  const price = tt
                    ? tt.totalForClient
                    : tier === "standard"
                      ? c.data.totals.clean
                      : tier === "comfort"
                        ? c.data.totals.shop
                        : c.data.totals.market;
                  const profit = tt
                    ? tt.cleanProfit
                    : tier === "premium"
                      ? c.data.totals.cleanProfit
                      : 0;
                  return (
                    <div key={tier}>
                      <p className="text-[8px] text-center text-muted-foreground uppercase">
                        {t(`detail.tiers.${tier}`)}
                      </p>
                      <p className="font-semibold text-center">{fmt(price)}</p>
                      <p className="font-semibold text-center text-green-600">
                        {fmt(profit)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
        description={t("details.deleteConfirm")}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />

      <ConfirmDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        description={t("details.deleteAllConfirm")}
        onConfirm={handleDeleteAll}
      />
    </div>
  );
}
