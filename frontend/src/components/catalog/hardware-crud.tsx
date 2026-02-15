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

interface HardwareType {
  id: string;
  name: string;
}

interface Hardware {
  id: string;
  brand: string | null;
  price: string;
  hardwareType: HardwareType;
}

export function HardwareCrud() {
  const t = useTranslations();
  const [items, setItems] = useState<Hardware[]>([]);
  const [types, setTypes] = useState<HardwareType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [hardwareTypeId, setHardwareTypeId] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("0");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [hw, hTypes] = await Promise.all([
        api.get("/catalog/hardware"),
        api.get("/catalog/hardware-types"),
      ]);
      setItems(hw.data);
      setTypes(hTypes.data);
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
    setHardwareTypeId("");
    setBrand("");
    setPrice("0");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...(editId ? {} : { hardwareTypeId }),
        brand: brand || undefined,
        price: parseFloat(price),
      };
      if (editId) {
        await api.patch(`/catalog/hardware/${editId}`, body);
        toast.success(t("common.updated"));
      } else {
        await api.post("/catalog/hardware", body);
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

  const handleEdit = (h: Hardware) => {
    setEditId(h.id);
    setHardwareTypeId(h.hardwareType.id);
    setBrand(h.brand || "");
    setPrice(String(h.price));
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/catalog/hardware/${id}`);
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
          {t("catalog.hardware")}
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
                    <Label>{t("catalog.hardwareLabel")}</Label>
                    <Select
                      value={hardwareTypeId}
                      onValueChange={setHardwareTypeId}
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
              <TableHead>{t("common.price")}</TableHead>
              <TableHead className="w-24 text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((h) => (
              <TableRow key={h.id}>
                <TableCell>
                  <Badge variant="outline">{h.hardwareType.name}</Badge>
                </TableCell>
                <TableCell>{h.brand || "—"}</TableCell>
                <TableCell>{Number(h.price).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.edit")}
                      onClick={() => handleEdit(h)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.delete")}
                      onClick={() => setDeleteId(h.id)}
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
                  colSpan={4}
                  className="h-16 text-center text-muted-foreground"
                >
                  {t("catalog.noHardware")}
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
        description={t("catalog.deleteHardware")}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
    </div>
  );
}
