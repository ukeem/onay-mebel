"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { API_BASE_URL } from "@/lib/constants";
import { parseNum, selectOnFocus } from "@/lib/utils";
import {
  ChevronDown,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";

import type { MaterialType, ModuleType } from "@/types";
import type { UserMaterial } from "./types";

export function UserMaterialsTab() {
  const t = useTranslations();

  const ALL_MODULE_TYPES: ModuleType[] = [
    "SECTION",
    "BACK_WALL",
    "PARTITION",
    "SHELF",
    "FACADE",
    "DRAWER",
    "FALSE_FACADE",
    "COUNTERTOP",
  ];

  const [items, setItems] = useState<UserMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);

  /* add dialog */
  const [addOpen, setAddOpen] = useState(false);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [newTypeId, setNewTypeId] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCalcType, setNewCalcType] = useState("SHEET");
  const [newLength, setNewLength] = useState("2800");
  const [newWidth, setNewWidth] = useState("2070");
  const [newPrice, setNewPrice] = useState("0");
  const [adding, setAdding] = useState(false);
  const [newModuleTypes, setNewModuleTypes] = useState<ModuleType[]>([]);

  /* delete confirm */
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* edit dialog */
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editBrand, setEditBrand] = useState("");
  const [editCalcType, setEditCalcType] = useState("SHEET");
  const [editLength, setEditLength] = useState("2800");
  const [editWidth, setEditWidth] = useState("2070");
  const [editPrice, setEditPrice] = useState("0");
  const [editModuleTypes, setEditModuleTypes] = useState<ModuleType[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/settings/materials");
      const list: UserMaterial[] = (res.data as UserMaterial[]).filter(
        (um) => um.material,
      );
      list.sort((a, b) => {
        const aCustom = a.material.userId ? 0 : 1;
        const bCustom = b.material.userId ? 0 : 1;
        if (aCustom !== bCustom) return aCustom - bCustom;
        return (a.material.materialType?.name ?? "").localeCompare(
          b.material.materialType?.name ?? "",
          "ru",
        );
      });
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
    fetchData();
  }, [fetchData]);

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

  const toggleEnabled = async (um: UserMaterial, enabled: boolean) => {
    try {
      await api.patch(`/settings/materials/${um.material.id}`, { enabled });
      setItems((prev) =>
        prev.map((item) => (item.id === um.id ? { ...item, enabled } : item)),
      );
      toast.success(t("common.updated"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  const toggleModuleType = async (um: UserMaterial, mt: ModuleType) => {
    const current = um.moduleTypes ?? [];
    const next = current.includes(mt)
      ? current.filter((v) => v !== mt)
      : [...current, mt];
    try {
      await api.patch(`/settings/materials/${um.material.id}`, {
        moduleTypes: next,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === um.id ? { ...item, moduleTypes: next } : item,
        ),
      );
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

  /* ── Add custom material ── */

  const openAddDialog = async () => {
    try {
      const res = await api.get("/catalog/material-types");
      setMaterialTypes(res.data);
    } catch {
      toast.error(t("common.error"));
      return;
    }
    setNewTypeId("");
    setNewBrand("");
    setNewCalcType("SHEET");
    setNewLength("2800");
    setNewWidth("2070");
    setNewPrice("0");
    setNewModuleTypes([]);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!newTypeId) return;
    setAdding(true);
    try {
      const created: UserMaterial = (
        await api.post("/settings/materials/custom", {
          materialTypeId: newTypeId,
          brand: newBrand || undefined,
          calcType: newCalcType,
          length: parseInt(newLength) || 1,
          width: parseInt(newWidth) || 1,
          price: parseNum(newPrice),
          moduleTypes: newModuleTypes,
        })
      ).data;
      setItems((prev) => [created, ...prev]);
      setPrices((p) => ({ ...p, [created.id]: String(created.price) }));
      setAddOpen(false);
      toast.success(t("settings.customMaterialAdded"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setAdding(false);
    }
  };

  /* ── Delete custom material ── */

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/settings/materials/custom/${deleteId}`);
      setItems((prev) => prev.filter((i) => i.material.id !== deleteId));
      toast.success(t("settings.customMaterialDeleted"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setDeleteId(null);
    }
  };

  /* ── Edit custom material ── */

  const openEditDialog = (um: UserMaterial) => {
    setEditId(um.material.id);
    setEditBrand(um.material.brand || "");
    setEditCalcType(um.material.calcType || "SHEET");
    setEditLength(String(um.material.length || 2800));
    setEditWidth(String(um.material.width || 2070));
    setEditPrice(String(um.price));
    setEditModuleTypes(um.moduleTypes ?? []);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await api.patch(`/settings/materials/custom/${editId}`, {
        brand: editBrand || undefined,
        calcType: editCalcType,
        length: parseInt(editLength) || 1,
        width: parseInt(editWidth) || 1,
        price: parseNum(editPrice),
        moduleTypes: editModuleTypes,
      });
      const updated: UserMaterial = res.data;
      setItems((prev) =>
        prev.map((i) => (i.material.id === editId ? updated : i)),
      );
      setPrices((p) => ({ ...p, [updated.id]: String(updated.price) }));
      setEditOpen(false);
      toast.success(t("common.updated"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
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
              <TableHead className="hidden md:table-cell">
                {t("settings.calcType")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t("settings.size")}
              </TableHead>
              <TableHead className="w-28 md:w-36">
                {t("settings.myPrice")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t("catalog.moduleTypes")}
              </TableHead>
              <TableHead className="w-20 text-center hidden md:table-cell">
                {t("settings.visible")}
              </TableHead>
              <TableHead className="w-10 hidden md:table-cell" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((um) => (
              <TableRow
                key={um.id}
                className={um.material.userId ? "bg-muted" : ""}
              >
                <TableCell className="hidden md:table-cell">
                  {um.material.image ? (
                    <Image
                      src={`${API_BASE_URL}${um.material.image}`}
                      alt={um.material.brand || ""}
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
                        checked={um.enabled}
                        onCheckedChange={(checked) =>
                          toggleEnabled(um, checked === true)
                        }
                        aria-label={t("settings.visible")}
                      />
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {um.material.materialType.name}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="max-w-[110px] truncate">
                  {um.material.userId ? (
                    <button
                      type="button"
                      className="text-left underline decoration-dotted underline-offset-4 hover:text-primary cursor-pointer"
                      onClick={() => openEditDialog(um)}
                    >
                      {um.material.brand || "—"}
                    </button>
                  ) : (
                    um.material.brand || "—"
                  )}
                </TableCell>
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
                  {um.material.userId ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                        >
                          {(um.moduleTypes ?? []).length || "—"}
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2">
                        {ALL_MODULE_TYPES.map((mt) => (
                          <label
                            key={mt}
                            className="flex items-center gap-2 py-1 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={(um.moduleTypes ?? []).includes(mt)}
                              onCheckedChange={() => toggleModuleType(um, mt)}
                            />
                            {t(`catalog.moduleTypeLabels.${mt}`)}
                          </label>
                        ))}
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {(um.moduleTypes ?? []).length || "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center hidden md:table-cell">
                  <Switch
                    checked={um.enabled}
                    onCheckedChange={(checked) =>
                      toggleEnabled(um, checked === true)
                    }
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => savePrice(um)}
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    {um.material.userId && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(um)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(um.material.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
                {/* Mobile delete */}
                {um.material.userId && (
                  <TableCell className="md:hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(um.material.id)}
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
                  colSpan={9}
                  className="h-16 text-center text-muted-foreground"
                >
                  {t("settings.noMaterials")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add custom material dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.addCustomMaterial")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.type")}</Label>
              <Select value={newTypeId} onValueChange={setNewTypeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("settings.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((mt) => (
                    <SelectItem key={mt.id} value={mt.id}>
                      {mt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.brand")} *</Label>
              <Input
                className="w-full"
                required
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder={t("settings.brandPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.calcType")}</Label>
              <Select value={newCalcType} onValueChange={setNewCalcType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHEET">
                    {t("settings.calcLabels.SHEET")}
                  </SelectItem>
                  <SelectItem value="SQM">
                    {t("settings.calcLabels.SQM")}
                  </SelectItem>
                  <SelectItem value="LM">
                    {t("settings.calcLabels.LM")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newCalcType === "SHEET" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("settings.lengthMm")}</Label>
                  <Input
                    className="w-full"
                    type="number"
                    value={newLength}
                    onChange={(e) => setNewLength(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("settings.widthMm")}</Label>
                  <Input
                    className="w-full"
                    type="number"
                    value={newWidth}
                    onChange={(e) => setNewWidth(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("settings.myPrice")} *</Label>
              <Input
                className="w-full"
                required
                type="text"
                inputMode="decimal"
                value={newPrice}
                onFocus={selectOnFocus}
                onChange={(e) =>
                  setNewPrice(e.target.value.replace(/\./g, ","))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("catalog.moduleTypes")}</Label>
              <div className="rounded-md border p-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {ALL_MODULE_TYPES.map((mt) => (
                    <label
                      key={mt}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={newModuleTypes.includes(mt)}
                        onCheckedChange={(checked) => {
                          setNewModuleTypes((prev) =>
                            checked
                              ? [...prev, mt]
                              : prev.filter((v) => v !== mt),
                          );
                        }}
                      />
                      {t(`catalog.moduleTypeLabels.${mt}`)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAdd}
              disabled={
                !newTypeId ||
                !newBrand.trim() ||
                !newPrice.trim() ||
                parseFloat(newPrice.replace(",", ".")) <= 0 ||
                (newCalcType === "SHEET" &&
                  (!newLength.trim() || !newWidth.trim())) ||
                adding
              }
            >
              {t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit custom material dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.edit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.brand")} *</Label>
              <Input
                className="w-full"
                required
                autoFocus
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.calcType")}</Label>
              <Select value={editCalcType} onValueChange={setEditCalcType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHEET">
                    {t("settings.calcLabels.SHEET")}
                  </SelectItem>
                  <SelectItem value="SQM">
                    {t("settings.calcLabels.SQM")}
                  </SelectItem>
                  <SelectItem value="LM">
                    {t("settings.calcLabels.LM")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editCalcType === "SHEET" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("settings.lengthMm")} *</Label>
                  <Input
                    className="w-full"
                    required
                    type="number"
                    value={editLength}
                    onChange={(e) => setEditLength(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("settings.widthMm")} *</Label>
                  <Input
                    className="w-full"
                    required
                    type="number"
                    value={editWidth}
                    onChange={(e) => setEditWidth(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("settings.myPrice")} *</Label>
              <Input
                className="w-full"
                required
                type="text"
                inputMode="decimal"
                value={editPrice}
                onFocus={selectOnFocus}
                onChange={(e) =>
                  setEditPrice(e.target.value.replace(/\./g, ","))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("catalog.moduleTypes")}</Label>
              <div className="rounded-md border p-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {ALL_MODULE_TYPES.map((mt) => (
                    <label
                      key={mt}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={editModuleTypes.includes(mt)}
                        onCheckedChange={(checked) => {
                          setEditModuleTypes((prev) =>
                            checked
                              ? [...prev, mt]
                              : prev.filter((v) => v !== mt),
                          );
                        }}
                      />
                      {t(`catalog.moduleTypeLabels.${mt}`)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleEditSave}
              disabled={
                saving ||
                !editBrand.trim() ||
                !editPrice.trim() ||
                parseFloat(editPrice.replace(",", ".")) <= 0 ||
                (editCalcType === "SHEET" &&
                  (!editLength.trim() || !editWidth.trim()))
              }
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        description={t("settings.deleteCustomMaterialConfirm")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
