"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
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
import { useFormatDate } from "@/hooks/use-format-date";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import type { ProjectSummary } from "@/types";
import {
  ChevronRight,
  Copy,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProjectsPage() {
  const formatDate = useFormatDate();
  const t = useTranslations();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [name, setName] = useState("");
  const [clientData, setClientData] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch {
      toast.error(t("projects.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await api.post("/projects", {
        name,
        clientData: clientData || undefined,
      });
      toast.success(t("projects.created"));
      setOpen(false);
      setName("");
      setClientData("");
      router.push(`/dashboard/projects/${res.data.id}`);
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/projects/${id}/duplicate`);
      toast.success(t("projects.copied"));
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/projects/${id}`);
      toast.success(t("projects.deleted"));
      fetchData();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setDeleteId(null);
    }
  };

  const openEdit = (p: ProjectSummary) => {
    setEditProject(p);
    setEditName(p.name);
    setEditClient(p.clientData || "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editProject) return;
    setSaving(true);
    try {
      await api.patch(`/projects/${editProject.id}`, {
        name: editName,
        clientData: editClient || undefined,
      });
      toast.success(t("projects.updated"));
      setEditOpen(false);
      setEditProject(null);
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
        <div className="flex items-center justify-between py-2.5">
          <div className="h-6 w-32 rounded bg-muted animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="gap-0 py-0">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Sticky header ── */}
      <div className="sticky top-12 md:top-0 z-20 mx-1 border-b bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 py-2 sm:gap-3">
          <h1 className="flex-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
            {t("projects.title")}
          </h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("projects.newProject")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("projects.newProject")}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreate();
                }}
              >
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label>{t("common.name")}</Label>
                    <Input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("projects.namePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("projects.clientData")}</Label>
                    <Input
                      value={clientData}
                      onChange={(e) => setClientData(e.target.value)}
                      placeholder={t("projects.clientPlaceholder")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!name.trim() || saving}>
                    {t("common.create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t("projects.empty")}
          description={t("projects.emptyHint")}
        />
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="gap-0 py-0 overflow-hidden transition-all hover:bg-accent/50 active:bg-accent/70 cursor-pointer"
              onClick={() => router.push(`/dashboard/projects/${p.id}`)}
            >
              <div className="px-4 py-3">
                {/* Top row: icon + name + chevron */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground mt-0.5">
                      {[p.clientData, formatDate(p.createdAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                {/* Bottom row: actions */}
                <div className="mt-2.5 flex justify-end -mr-2">
                  <div
                    className="flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      title={t("projects.copy")}
                      aria-label={t("projects.copy")}
                      onClick={() => handleDuplicate(p.id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      title={t("common.edit")}
                      aria-label={t("common.edit")}
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={t("common.delete")}
                      aria-label={t("common.delete")}
                      onClick={() => setDeleteId(p.id)}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("projects.editProject")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEdit();
            }}
          >
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>{t("common.name")}</Label>
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t("projects.projectNamePlaceholder")}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("projects.clientData")}</Label>
                <Input
                  value={editClient}
                  onChange={(e) => setEditClient(e.target.value)}
                  placeholder={t("projects.clientPlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!editName.trim() || saving}>
                {t("common.edit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
        description={t("projects.deleteConfirm")}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
    </div>
  );
}
