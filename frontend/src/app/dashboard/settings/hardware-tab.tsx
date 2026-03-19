"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { API_BASE_URL } from "@/lib/constants";

import type { HardwareType, UserHardware } from "@/types";

const API_BASE = API_BASE_URL;

export function UserHardwareTab() {
  const t = useTranslations();
  const [items, setItems] = useState<UserHardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);

  /* add dialog */
  const [addOpen, setAddOpen] = useState(false);
  const [hardwareTypes, setHardwareTypes] = useState<HardwareType[]>([]);
  const [newTypeId, setNewTypeId] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [adding, setAdding] = useState(false);

  /* delete confirm */
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/settings/hardware");
      const list: UserHardware[] = (res.data as UserHardware[]).filter(
        (uh) => uh.hardware,
      );
      list.sort((a, b) => {
        const aCustom = a.hardware.userId ? 0 : 1;
        const bCustom = b.hardware.userId ? 0 : 1;
        if (aCustom !== bCustom) return aCustom - bCustom;
        return (a.hardware.hardwareType?.name ?? "").localeCompare(
          b.hardware.hardwareType?.name ?? "",
          "ru",
        );
      });
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
    fetchData();
  }, [fetchData]);

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

  const toggleEnabled = async (uh: UserHardware, enabled: boolean) => {
    try {
      await api.patch(`/settings/hardware/${uh.hardware.id}`, { enabled });
      setItems((prev) =>
        prev.map((item) => (item.id === uh.id ? { ...item, enabled } : item)),
      );
      toast.success(t("common.updated"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post("/settings/sync");
      toast.success(t("common.synced"));
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSyncing(false);
    }
  };

  /* ── Add custom hardware ── */

  const openAddDialog = async () => {
    try {
      const res = await api.get("/catalog/hardware-types");
      setHardwareTypes(res.data);
    } catch {
      toast.error(t("common.error"));
      return;
    }
    setNewTypeId("");
    setNewBrand("");
    setNewPrice("0");
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!newTypeId) return;
    setAdding(true);
    try {
      const created: UserHardware = (
        await api.post("/settings/hardware/custom", {
          hardwareTypeId: newTypeId,
          brand: newBrand || undefined,
          price: parseNum(newPrice),
        })
      ).data;
      setItems((prev) => [created, ...prev]);
      setPrices((p) => ({ ...p, [created.id]: String(created.price) }));
      setAddOpen(false);
      toast.success(t("settings.customHardwareAdded"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setAdding(false);
    }
  };

  /* ── Delete custom hardware ── */

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/settings/hardware/custom/${deleteId}`);
      setItems((prev) => prev.filter((i) => i.hardware.id !== deleteId));
      toast.success(t("settings.customHardwareDeleted"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setDeleteId(null);
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openAddDialog}>
            <Plus className="mr-1 h-3 w-3" />
            {t("common.add")}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={sync}
            disabled={syncing}
            title={t("common.sync")}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 hidden md:table-cell" />
              <TableHead>{t("common.type")}</TableHead>
              <TableHead>{t("common.brand")}</TableHead>
              <TableHead className="w-28 md:w-36">
                {t("settings.myPrice")}
              </TableHead>
              <TableHead className="w-20 text-center hidden md:table-cell">
                {t("settings.visible")}
              </TableHead>
              <TableHead className="w-10 hidden md:table-cell" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((uh) => (
              <TableRow
                key={uh.id}
                className={uh.hardware.userId ? "bg-muted" : ""}
              >
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
                  <div className="flex flex-col gap-1.5">
                    <div className="flex md:hidden">
                      <Switch
                        checked={uh.enabled}
                        onCheckedChange={(checked) =>
                          toggleEnabled(uh, checked === true)
                        }
                        aria-label={t("settings.visible")}
                      />
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {uh.hardware.hardwareType.name}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="max-w-[110px] truncate">
                  {uh.hardware.brand || "—"}
                </TableCell>
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
                <TableCell className="text-center hidden md:table-cell">
                  <Switch
                    checked={uh.enabled}
                    onCheckedChange={(checked) =>
                      toggleEnabled(uh, checked === true)
                    }
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => savePrice(uh)}
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    {uh.hardware.userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(uh.hardware.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                {/* Mobile delete */}
                {uh.hardware.userId && (
                  <TableCell className="md:hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(uh.hardware.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-16 text-center text-muted-foreground"
                >
                  {t("settings.noHardware")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add custom hardware dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.addCustomHardware")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("common.type")}</Label>
              <Select value={newTypeId} onValueChange={setNewTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("settings.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  {hardwareTypes.map((ht) => (
                    <SelectItem key={ht.id} value={ht.id}>
                      {ht.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("common.brand")}</Label>
              <Input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder={t("settings.brandPlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("settings.myPrice")}</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={newPrice}
                onFocus={selectOnFocus}
                onChange={(e) =>
                  setNewPrice(e.target.value.replace(/\./g, ","))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={!newTypeId || adding}>
              {t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        description={t("settings.deleteCustomHardwareConfirm")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
