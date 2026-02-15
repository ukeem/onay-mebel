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
  DialogTrigger,
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
import { Spinner } from "@/components/ui/spinner";
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
import { selectOnFocus } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface MaterialType {
  id: string;
  name: string;
}

interface Material {
  id: string;
  brand: string | null;
  calcType: "SHEET" | "SQM" | "LM";
  length: number;
  width: number;
  price: string;
  materialType: MaterialType;
}

export function MaterialsCrud() {
  const t = useTranslations();
  const calcTypeLabels: Record<string, string> = {
    SHEET: t("settings.calcLabels.SHEET"),
    SQM: t("settings.calcLabels.SQM"),
    LM: t("settings.calcLabels.LM"),
  };
  const [items, setItems] = useState<Material[]>([]);
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [materialTypeId, setMaterialTypeId] = useState("");
  const [brand, setBrand] = useState("");
  const [calcType, setCalcType] = useState("SHEET");
  const [length, setLength] = useState("2800");
  const [width, setWidth] = useState("2070");
  const [price, setPrice] = useState("0");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [mats, mTypes] = await Promise.all([
        api.get("/catalog/materials"),
        api.get("/catalog/material-types"),
      ]);
      setItems(mats.data);
      setTypes(mTypes.data);
    } catch {
      toast.error(t("catalog.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const resetForm = () => {
    setEditId(null);
    setMaterialTypeId("");
    setBrand("");
    setCalcType("SHEET");
    setLength("2800");
    setWidth("2070");
    setPrice("0");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...(editId ? {} : { materialTypeId }),
        brand: brand || undefined,
        calcType,
        length: parseInt(length),
        width: parseInt(width),
        price: parseFloat(price),
      };
      if (editId) {
        await api.patch(`/catalog/materials/${editId}`, body);
        toast.success(t("common.updated"));
      } else {
        await api.post("/catalog/materials", body);
        toast.success(t("common.added"));
      }
      setOpen(false);
      resetForm();
      fetchAll();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m: Material) => {
    setEditId(m.id);
    setMaterialTypeId(m.materialType.id);
    setBrand(m.brand || "");
    setCalcType(m.calcType);
    setLength(String(m.length));
    setWidth(String(m.width));
    setPrice(String(m.price));
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/catalog/materials/${id}`);
      toast.success(t("common.deleted"));
      fetchAll();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("catalog.materials")}
        </h2>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-3 w-3" />
              {t("common.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editId ? t("common.edit") : t("common.add")}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="grid gap-3">
                {!editId && (
                  <div className="space-y-1">
                    <Label>{t("catalog.materialLabel")}</Label>
                    <Select
                      value={materialTypeId}
                      onValueChange={setMaterialTypeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((tp) => (
                          <SelectItem key={tp.id} value={tp.id}>
                            {tp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>{t("common.brand")}</Label>
                  <Input
                    autoFocus={!!editId}
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder={t("common.optional")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("catalog.calcType")}</Label>
                  <Select value={calcType} onValueChange={setCalcType}>
                    <SelectTrigger>
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>{t("catalog.lengthMm")}</Label>
                    <Input
                      type="number"
                      value={length}
                      onFocus={selectOnFocus}
                      onChange={(e) => setLength(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("catalog.widthMm")}</Label>
                    <Input
                      type="number"
                      value={width}
                      onFocus={selectOnFocus}
                      onChange={(e) => setWidth(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("catalog.priceLabel")}</Label>
                  <Input
                    type="number"
                    value={price}
                    onFocus={selectOnFocus}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.type")}</TableHead>
              <TableHead>{t("common.brand")}</TableHead>
              <TableHead>{t("settings.calcType")}</TableHead>
              <TableHead>{t("settings.size")}</TableHead>
              <TableHead>{t("common.price")}</TableHead>
              <TableHead className="w-24 text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Badge variant="outline">{m.materialType.name}</Badge>
                </TableCell>
                <TableCell>{m.brand || "—"}</TableCell>
                <TableCell>{calcTypeLabels[m.calcType]}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.length}×{m.width}
                </TableCell>
                <TableCell>{Number(m.price).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.edit")}
                      onClick={() => handleEdit(m)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.delete")}
                      onClick={() => setDeleteId(m.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-16 text-center text-muted-foreground"
                >
                  {t("catalog.noMaterials")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
        description={t("catalog.deleteMaterial")}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
    </div>
  );
}
