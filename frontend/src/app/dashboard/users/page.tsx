"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { Spinner } from "@/components/ui/spinner";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { formatPhone, rawPhone } from "@/lib/phone-mask";
import { useAuthStore } from "@/stores/auth.store";
import type { User } from "@/types";
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Trash2,
  Unlock,
  User as UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const roleBadge = (role: string, t: (key: string) => string) => {
  switch (role) {
    case "SUPER":
      return <Badge variant="destructive">{t("users.roleSuper")}</Badge>;
    case "ADMIN":
      return <Badge variant="secondary">{t("users.roleAdmin")}</Badge>;
    default:
      return <Badge variant="outline">{t("users.roleUser")}</Badge>;
  }
};

const statusBadge = (status: string, t: (key: string) => string) => {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-700">
          {t("users.active")}
        </Badge>
      );
    case "BLOCKED":
      return <Badge variant="destructive">{t("users.blocked")}</Badge>;
    default:
      return (
        <Badge className="bg-gray-500 text-white hover:bg-gray-600">
          {t("users.inactive")}
        </Badge>
      );
  }
};

export default function UsersPage() {
  const t = useTranslations();
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("+7 ");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("USER");
  const [creating, setCreating] = useState(false);

  // Inline password editing per user
  const [pwdEdits, setPwdEdits] = useState<Record<string, string>>({});
  const [pwdVisible, setPwdVisible] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data.filter((u: User) => u.role !== "SUPER"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post("/users", {
        phone: rawPhone(newPhone),
        password: newPassword,
        role: newRole,
      });
      toast.success(t("users.created"));
      setCreateOpen(false);
      setNewPhone("+7 ");
      setNewPassword("");
      setNewRole("USER");
      fetchUsers();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleBlock = async (user: User) => {
    try {
      if (user.status === "BLOCKED") {
        // Unlock: backend decides ACTIVE/INACTIVE based on activeUntil
        await api.patch(`/users/${user.id}`, { status: "ACTIVE" });
        toast.success(t("users.unblocked"));
      } else {
        // Lock
        await api.patch(`/users/${user.id}`, { status: "BLOCKED" });
        toast.success(t("users.blocked"));
      }
      fetchUsers();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  const handleDelete = async (user: User) => {
    try {
      await api.delete(`/users/${user.id}`);
      toast.success(t("users.userDeleted"));
      fetchUsers();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSavePassword = async (userId: string) => {
    const newPwd = pwdEdits[userId];
    if (!newPwd || newPwd.length < 8) {
      toast.error(t("auth.minPassword"));
      return;
    }
    try {
      await api.patch(`/users/${userId}/password`, { newPassword: newPwd });
      toast.success(t("users.passwordChanged"));
      setPwdEdits((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  const handleActiveUntilChange = async (userId: string, dateStr: string) => {
    try {
      await api.patch(`/users/${userId}`, {
        activeUntil: dateStr ? new Date(dateStr).toISOString() : null,
      });
      toast.success(t("users.termUpdated"));
      fetchUsers();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  const isSuper = currentUser?.role === "SUPER";

  return (
    <div className="space-y-3">
      {/* ── Sticky header ── */}
      <div className="sticky top-12 md:top-0 z-20 -mx-1 border-b bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 py-2.5 sm:gap-3">
          <h1 className="flex-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
            {t("users.title")}
          </h1>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("users.addUser")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("users.newUser")}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreate();
                }}
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t("users.phone")}</Label>
                    <Input
                      autoFocus
                      value={newPhone}
                      onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                      placeholder="+7 700 123 45 67"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("auth.password")}</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t("auth.minPassword")}
                      minLength={8}
                    />
                  </div>
                  {isSuper && (
                    <div className="space-y-1">
                      <Label>{t("users.role")}</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">
                            {t("users.roleUser")}
                          </SelectItem>
                          <SelectItem value="ADMIN">
                            {t("users.roleAdmin")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? t("auth.creating") : t("common.create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={UserIcon} title={t("users.noUsers")} />
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const isSelf = u.id === currentUser?.id;
            const isSuperTarget = u.role === "SUPER";
            const canEdit = !isSelf && !isSuperTarget;

            return (
              <Card key={u.id} className="gap-0 py-0 overflow-hidden">
                <div className="px-4 py-3 space-y-2">
                  {/* Row 1: icon + phone/status + actions */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">
                        {u.phone}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {statusBadge(u.status, t)}
                        {roleBadge(u.role, t)}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="shrink-0 flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={
                            u.status === "BLOCKED"
                              ? t("users.unblock")
                              : t("users.block")
                          }
                          aria-label={
                            u.status === "BLOCKED"
                              ? t("users.unblock")
                              : t("users.block")
                          }
                          onClick={() => handleToggleBlock(u)}
                        >
                          {u.status === "BLOCKED" ? (
                            <Unlock className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-orange-500" />
                          )}
                        </Button>
                        {isSuper && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={t("common.delete")}
                            aria-label={t("common.delete")}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 2+3: active until + password — stacked on mobile, inline on desktop */}
                  {canEdit && (
                    <div className="pl-11 flex flex-col gap-2 md:flex-row md:items-end">
                      <div className="space-y-1 md:flex-1">
                        <span className="text-[11px] text-muted-foreground">
                          {t("users.registered")}{" "}
                          {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                        <div className="space-y-1">
                          <span className="text-[11px] text-muted-foreground">
                            {t("users.activeTill")}
                          </span>
                          <Input
                            type="date"
                            className="h-8 w-full text-sm"
                            value={
                              u.activeUntil
                                ? new Date(u.activeUntil)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              handleActiveUntilChange(u.id, e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 md:flex-1">
                        <div className="relative flex-1">
                          <Input
                            type={pwdVisible[u.id] ? "text" : "password"}
                            placeholder={t("users.newPasswordPlaceholder")}
                            className="h-8 w-full text-sm pr-8"
                            value={pwdEdits[u.id] || ""}
                            onChange={(e) =>
                              setPwdEdits((prev) => ({
                                ...prev,
                                [u.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={
                              pwdVisible[u.id]
                                ? t("common.hidePassword")
                                : t("common.showPassword")
                            }
                            onClick={() =>
                              setPwdVisible((prev) => ({
                                ...prev,
                                [u.id]: !prev[u.id],
                              }))
                            }
                          >
                            {pwdVisible[u.id] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {pwdEdits[u.id] && pwdEdits[u.id].length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            aria-label={t("users.savePassword")}
                            onClick={() => handleSavePassword(u.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        description={
          deleteTarget
            ? t("users.deleteUserConfirm", { phone: deleteTarget.phone })
            : ""
        }
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
