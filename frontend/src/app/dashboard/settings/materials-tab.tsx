"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { API_BASE_URL } from "@/lib/constants";
import { parseNum, selectOnFocus } from "@/lib/utils";
import { RefreshCw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";

import type { UserMaterial } from "./types";

export function UserMaterialsTab() {
  const t = useTranslations();
  const [items, setItems] = useState<UserMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/settings/materials");
      const list: UserMaterial[] = res.data;
      list.sort((a, b) =>
        a.material.materialType.name.localeCompare(
          b.material.materialType.name,
          "ru",
        ),
      );
      setItems(list);
      const p: Record<string, string> = {};
      list.forEach((i) => (p[i.id] = String(i.price)));
      setPrices(p);
    } catch {
      toast.error(t("settings.loadMaterialsError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const savePrice = async (um: UserMaterial) => {
    try {
      await api.patch(`/settings/materials/${um.material.id}`, {
        price: parseNum(prices[um.id] ?? ""),
      });
      toast.success(t("settings.priceUpdated"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post("/settings/sync");
      toast.success(t("common.synced"));
      fetch();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSyncing(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("settings.myMaterials")}
        </h2>
        <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
          <RefreshCw
            className={`mr-1 h-3 w-3 ${syncing ? "animate-spin" : ""}`}
          />
          {t("common.sync")}
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 hidden md:table-cell" />
              <TableHead>{t("common.type")}</TableHead>
              <TableHead>{t("common.brand")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("settings.calcType")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t("settings.size")}
              </TableHead>
              <TableHead className="w-28 md:w-36">
                {t("settings.myPrice")}
              </TableHead>
              <TableHead className="w-10 hidden md:table-cell" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((um) => (
              <TableRow key={um.id}>
                <TableCell className="hidden md:table-cell">
                  {um.material.image ? (
                    <img
                      src={`${API_BASE_URL}${um.material.image}`}
                      alt={um.material.brand || ""}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {um.material.materialType.name}
                  </Badge>
                </TableCell>
                <TableCell>{um.material.brand || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {t(`settings.calcLabels.${um.material.calcType}`)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {um.material.length}×{um.material.width}
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="h-7 text-sm"
                    value={prices[um.id] ?? ""}
                    onFocus={selectOnFocus}
                    onChange={(e) =>
                      setPrices((p) => ({
                        ...p,
                        [um.id]: e.target.value.replace(/\./g, ","),
                      }))
                    }
                    onBlur={() => savePrice(um)}
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => savePrice(um)}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-16 text-center text-muted-foreground"
                >
                  {t("settings.noMaterials")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
