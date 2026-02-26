"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface TypeItem {
  id: string;
  name: string;
  price?: number;
}

interface TypeCrudProps {
  endpoint: string; // e.g. "/catalog/room-types"
  title: string;
  showPrice?: boolean;
}

export function TypeCrud({ endpoint, title, showPrice }: TypeCrudProps) {
  const t = useTranslations();
  const [items, setItems] = useState<TypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get(endpoint);
      setItems(data);
    } catch {
      toast.error(t("catalog.loadError"));
    } finally {
      setLoading(false);
    }
  }, [endpoint, t]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name };
      if (showPrice) payload.price = Number(price) || 0;
      if (editId) {
        await api.patch(`${endpoint}/${editId}`, payload);
        toast.success(t("common.updated"));
      } else {
        await api.post(endpoint, payload);
        toast.success(t("common.added"));
      }
      setOpen(false);
      setName("");
      setPrice("");
      setEditId(null);
      fetch();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: TypeItem) => {
    setEditId(item.id);
    setName(item.name);
    setPrice(item.price != null ? String(item.price) : "");
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`${endpoint}/${id}`);
      toast.success(t("common.deleted"));
      fetch();
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
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditId(null);
              setName("");
              setPrice("");
            }
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
                {editId ? t("common.edit") : t("common.add")} — {title}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("common.name")}</Label>
                  <Input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("common.name")}
                  />
                </div>
                {showPrice && (
                  <div className="space-y-2">
                    <Label>{t("common.price")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!name.trim() || saving}>
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
              <TableHead>{t("common.name")}</TableHead>
              {showPrice && (
                <TableHead className="w-32">{t("common.price")}</TableHead>
              )}
              <TableHead className="w-24 text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                {showPrice && (
                  <TableCell>{item.price ?? 0}</TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.edit")}
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.delete")}
                      onClick={() => setDeleteId(item.id)}
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
                  colSpan={showPrice ? 3 : 2}
                  className="h-16 text-center text-muted-foreground"
                >
                  {t("common.noRecords")}
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
        description={t("catalog.deleteConfirm")}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
    </div>
  );
}
