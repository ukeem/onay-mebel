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
import { API_BASE_URL } from "@/lib/constants";
import { selectOnFocus } from "@/lib/utils";
import type { Hardware, HardwareType } from "@/types";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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
    setImage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...(editId ? {} : { hardwareTypeId }),
        brand: brand || undefined,
        price: parseFloat(price),
        image: image || undefined,
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
    setImage(h.image);
    setOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImage(res.data.url);
      toast.success(t("catalog.imageUploaded"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setUploading(false);
    }
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
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onFocus={selectOnFocus}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("catalog.image")}</Label>
                  <div className="flex items-center gap-3">
                    {image && (
                      <Image
                        src={`${API_BASE_URL}${image}`}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-md border object-cover"
                      />
                    )}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                      <span className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                        <ImagePlus className="h-3.5 w-3.5" />
                        {uploading
                          ? "..."
                          : image
                            ? t("catalog.changeImage")
                            : t("catalog.uploadImage")}
                      </span>
                    </label>
                  </div>
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
              <TableHead></TableHead>
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
                <TableCell className="w-12">
                  {h.image ? (
                    <Image
                      src={`${API_BASE_URL}${h.image}`}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded border object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded border bg-muted" />
                  )}
                </TableCell>
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
                  colSpan={5}
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
