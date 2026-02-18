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
import { parseNum, selectOnFocus } from "@/lib/utils";
import { RefreshCw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { API_BASE_URL } from "@/lib/constants";

import type { UserHardware } from "./types";

const API_BASE = API_BASE_URL;

export function UserHardwareTab() {
  const t = useTranslations();
  const [items, setItems] = useState<UserHardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/settings/hardware");
      const list: UserHardware[] = res.data;
      list.sort((a, b) =>
        a.hardware.hardwareType.name.localeCompare(
          b.hardware.hardwareType.name,
          "ru",
        ),
      );
      setItems(list);
      const p: Record<string, string> = {};
      list.forEach((i) => (p[i.id] = String(i.price)));
      setPrices(p);
    } catch {
      toast.error(t("settings.loadHardwareError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const savePrice = async (uh: UserHardware) => {
    try {
      await api.patch(`/settings/hardware/${uh.hardware.id}`, {
        price: parseNum(prices[uh.id] ?? ""),
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
          {t("settings.myHardware")}
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
              <TableHead className="w-28 md:w-36">
                {t("settings.myPrice")}
              </TableHead>
              <TableHead className="w-10 hidden md:table-cell" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((uh) => (
              <TableRow key={uh.id}>
                <TableCell className="hidden md:table-cell">
                  {uh.hardware.image ? (
                    <Image
                      src={`${API_BASE}${uh.hardware.image}`}
                      alt={uh.hardware.brand || ""}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {uh.hardware.hardwareType.name}
                  </Badge>
                </TableCell>
                <TableCell>{uh.hardware.brand || "—"}</TableCell>
                <TableCell>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="h-7 text-sm"
                    value={prices[uh.id] ?? ""}
                    onFocus={selectOnFocus}
                    onChange={(e) =>
                      setPrices((p) => ({
                        ...p,
                        [uh.id]: e.target.value.replace(/\./g, ","),
                      }))
                    }
                    onBlur={() => savePrice(uh)}
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => savePrice(uh)}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-16 text-center text-muted-foreground"
                >
                  {t("settings.noHardware")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
