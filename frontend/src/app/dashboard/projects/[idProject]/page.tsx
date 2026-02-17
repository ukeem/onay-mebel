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
import { Input } from "@/components/ui/input";
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
import type { RoomType } from "@/types";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  DoorOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Room {
  id: string;
  roomType: RoomType;
  products: { id: string; productType: { name: string } }[];
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  clientData: string | null;
  rooms: Room[];
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ idProject: string }>;
}) {
  const { idProject } = use(params);
  const router = useRouter();
  const t = useTranslations();

  const [project, setProject] = useState<Project | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  /* add room dialog */
  const [addOpen, setAddOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");

  /* edit project dialog */
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  /* edit room type dialog */
  const [editRoomTypeRoom, setEditRoomTypeRoom] = useState<Room | null>(null);
  const [editRoomTypeValue, setEditRoomTypeValue] = useState("");
  const [editRoomTypeSaving, setEditRoomTypeSaving] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/projects/${idProject}`),
        api.get("/catalog/room-types"),
      ]);
      setProject(pRes.data);
      setRoomTypes(tRes.data);
      setEditName(pRes.data.name);
      setEditClient(pRes.data.clientData || "");
    } catch {
      toast.error(t("project.loadError"));
    } finally {
      setLoading(false);
    }
  }, [idProject, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddRoom = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/rooms", {
        projectId: idProject,
        roomTypeId: selectedType,
      });
      toast.success(t("project.roomAdded"));
      setAddOpen(false);
      setSelectedType("");
      router.push(`/dashboard/projects/${idProject}/${data.id}`);
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await api.delete(`/rooms/${roomId}`);
      toast.success(t("project.roomDeleted"));
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setDeleteRoomId(null);
    }
  };

  const handleCopyRoom = async (roomId: string) => {
    try {
      await api.post(`/rooms/${roomId}/copy`);
      toast.success(t("project.roomCopied"));
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  const handleEditRoomType = async () => {
    if (!editRoomTypeRoom || !editRoomTypeValue) return;
    setEditRoomTypeSaving(true);
    try {
      await api.patch(`/rooms/${editRoomTypeRoom.id}`, {
        roomTypeId: editRoomTypeValue,
      });
      toast.success(t("project.roomTypeUpdated"));
      setEditRoomTypeRoom(null);
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setEditRoomTypeSaving(false);
    }
  };

  const handleEditProject = async () => {
    setSaving(true);
    try {
      await api.patch(`/projects/${idProject}`, {
        name: editName,
        clientData: editClient || undefined,
      });
      toast.success(t("projects.updated"));
      setEditOpen(false);
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
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
          <div className="h-9 w-20 rounded-lg bg-muted animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="gap-0 py-0">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!project) {
    return <EmptyState icon={DoorOpen} title={t("project.notFound")} />;
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
            onClick={() => router.push("/dashboard/projects")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              {project.name}
            </h1>
            {project.clientData && (
              <p className="text-xs text-muted-foreground truncate">
                {project.clientData}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Add room ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("common.rooms")}
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t("project.addRoom")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("project.addRoom")}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddRoom();
              }}
            >
              <div className="space-y-1">
                <Label>{t("project.roomType")}</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("common.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name}
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

      {/* ── Rooms list ── */}
      {project.rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title={t("project.noRooms")}
          description={t("project.noRoomsHint")}
        />
      ) : (
        <div className="space-y-2">
          {project.rooms.map((r) => (
            <Card
              key={r.id}
              className="gap-0 py-0 overflow-hidden transition-all hover:bg-accent/50 active:bg-accent/70 cursor-pointer"
              onClick={() =>
                router.push(`/dashboard/projects/${idProject}/${r.id}`)
              }
            >
              <div className="px-4 py-3">
                {/* Top row: icon + name + chevron */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <DoorOpen className="h-4 w-4" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {r.roomType.name}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                {/* Bottom row: products count + actions */}
                <div className="mt-1.5 flex items-center pl-11">
                  <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                    {t("project.productsCount", { count: r.products.length })}
                  </p>
                  <div
                    className="shrink-0 flex items-center -mr-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopyRoom(r.id)}
                      title={t("project.copyRoom")}
                      aria-label={t("project.copyRoom")}
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditRoomTypeRoom(r);
                        setEditRoomTypeValue(r.roomType.id);
                      }}
                      title={t("project.editRoomType")}
                      aria-label={t("project.editRoomType")}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.delete")}
                      onClick={() => setDeleteRoomId(r.id)}
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

      {/* ── Edit project dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("project.editTitle")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEditProject();
            }}
          >
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>{t("common.name")}</Label>
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("project.clientData")}</Label>
                <Input
                  value={editClient}
                  onChange={(e) => setEditClient(e.target.value)}
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

      <ConfirmDialog
        open={!!deleteRoomId}
        onOpenChange={(v) => {
          if (!v) setDeleteRoomId(null);
        }}
        description={t("project.deleteRoomConfirm")}
        onConfirm={() => {
          if (deleteRoomId) handleDeleteRoom(deleteRoomId);
        }}
      />

      {/* Edit room type dialog */}
      <Dialog
        open={!!editRoomTypeRoom}
        onOpenChange={(v) => {
          if (!v) setEditRoomTypeRoom(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("project.editRoomType")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEditRoomType();
            }}
          >
            <div className="space-y-1">
              <Label>{t("project.roomType")}</Label>
              <Select
                value={editRoomTypeValue}
                onValueChange={setEditRoomTypeValue}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("common.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!editRoomTypeValue || editRoomTypeSaving}
              >
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
