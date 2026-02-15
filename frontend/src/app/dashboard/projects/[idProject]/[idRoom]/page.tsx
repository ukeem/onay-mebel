"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ProjectBottomBar } from "@/components/project-bottom-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  FolderKanban,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ProductType {
  id: string;
  name: string;
}

interface Product {
  id: string;
  productType: ProductType;
  width: number | null;
  height: number | null;
  depth: number | null;
}

interface Room {
  id: string;
  roomType: { id: string; name: string };
  project: { id: string; name: string };
  products: Product[];
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ idProject: string; idRoom: string }>;
}) {
  const { idProject, idRoom } = use(params);
  const router = useRouter();
  const t = useTranslations();

  const [room, setRoom] = useState<Room | null>(null);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  /* add product dialog */
  const [addOpen, setAddOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* edit type dialog */
  const [editTypeProduct, setEditTypeProduct] = useState<Product | null>(null);
  const [editTypeValue, setEditTypeValue] = useState("");
  const [editTypeSaving, setEditTypeSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [rRes, tRes] = await Promise.all([
        api.get(`/rooms/${idRoom}`),
        api.get("/catalog/product-types"),
      ]);
      setRoom(rRes.data);
      setProductTypes(tRes.data);
    } catch {
      toast.error(t("room.loadError"));
    } finally {
      setLoading(false);
    }
  }, [idRoom, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddProduct = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/products", {
        roomId: idRoom,
        productTypeId: selectedType,
      });
      toast.success(t("room.productAdded"));
      setAddOpen(false);
      setSelectedType("");
      router.push(`/dashboard/projects/${idProject}/${idRoom}/${data.id}`);
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await api.delete(`/products/${productId}`);
      toast.success(t("room.productDeleted"));
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setDeleteProductId(null);
    }
  };

  const handleCopyProduct = async (productId: string) => {
    try {
      await api.post(`/products/${productId}/copy`);
      toast.success(t("room.productCopied"));
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  const handleEditType = async () => {
    if (!editTypeProduct || !editTypeValue) return;
    setEditTypeSaving(true);
    try {
      await api.patch(`/products/${editTypeProduct.id}`, {
        productTypeId: editTypeValue,
      });
      toast.success(t("room.typeUpdated"));
      setEditTypeProduct(null);
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setEditTypeSaving(false);
    }
  };

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 py-2.5">
          <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-5 w-40 rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
          </div>
        </div>
        {[1, 2].map((i) => (
          <Card key={i} className="gap-0 py-0">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!room) {
    return <EmptyState icon={FolderKanban} title={t("room.notFound")} />;
  }

  return (
    <div className="space-y-3 pb-16">
      {/* ── Sticky header ── */}
      <div className="sticky top-12 md:top-0 z-20 border-b bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 py-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label={t("common.back")}
            onClick={() => router.push(`/dashboard/projects/${idProject}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              {room.roomType.name}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {room.project.name}
            </p>
          </div>
        </div>
      </div>

      {/* ── Add product ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("common.products")}
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t("room.addProduct")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("room.addProduct")}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddProduct();
              }}
            >
              <div className="space-y-1">
                <Label>{t("room.productType")}</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("common.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id}>
                        {pt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!selectedType || saving}>
                  {t("common.add")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Products list ── */}
      {room.products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("room.noProducts")}
          description={t("room.noProductsHint")}
        />
      ) : (
        <div className="space-y-2">
          {room.products.map((p) => (
            <Card
              key={p.id}
              className="gap-0 py-0 overflow-hidden transition-all hover:bg-accent/50 active:bg-accent/70 cursor-pointer"
              onClick={() =>
                router.push(
                  `/dashboard/projects/${idProject}/${idRoom}/${p.id}`,
                )
              }
            >
              <div className="px-4 py-3">
                {/* Top row: icon + name + chevron */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {p.productType.name}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                {/* Bottom row: dimensions + actions */}
                <div className="mt-1.5 flex items-center pl-11">
                  <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {p.width || p.height || p.depth
                      ? `${p.width ?? "—"} × ${p.height ?? "—"} × ${p.depth ?? "—"} ${t("common.mm")}`
                      : "\u00A0"}
                  </p>
                  <div
                    className="shrink-0 flex items-center -mr-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopyProduct(p.id)}
                      title={t("room.copyProduct")}
                      aria-label={t("room.copyProduct")}
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditTypeProduct(p);
                        setEditTypeValue(p.productType.id);
                      }}
                      title={t("room.editType")}
                      aria-label={t("room.editType")}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.delete")}
                      onClick={() => setDeleteProductId(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Fixed bottom bar ── */}
      <ProjectBottomBar projectId={idProject} />

      <ConfirmDialog
        open={!!deleteProductId}
        onOpenChange={(v) => {
          if (!v) setDeleteProductId(null);
        }}
        description={t("room.deleteProductConfirm")}
        onConfirm={() => {
          if (deleteProductId) handleDeleteProduct(deleteProductId);
        }}
      />

      {/* Edit type dialog */}
      <Dialog
        open={!!editTypeProduct}
        onOpenChange={(v) => {
          if (!v) setEditTypeProduct(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("room.editType")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEditType();
            }}
          >
            <div className="space-y-1">
              <Label>{t("room.productType")}</Label>
              <Select value={editTypeValue} onValueChange={setEditTypeValue}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("common.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!editTypeValue || editTypeSaving}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
