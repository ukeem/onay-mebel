"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { API_BASE_URL } from "@/lib/constants";
import { parseNum, selectOnFocus } from "@/lib/utils";
import { Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserService } from "./types";

/* ═══════════════════════════════════════════
   USER SERVICE TAB
   ═══════════════════════════════════════════ */

export function UserServiceTab() {
  return (
    <div className="space-y-8">
      <ServiceSettingsSection />
      <Separator />
      <CompanyInfoSection />
      <Separator />
      <PaymentStagesSection />
      <Separator />
      <ContactsSection />
    </div>
  );
}

/* ═══ SERVICE SETTINGS (existing) ═══ */

function ServiceSettingsSection() {
  const t = useTranslations();
  const [data, setData] = useState<UserService | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sawing, setSawing] = useState("0");
  const [drilling, setDrilling] = useState("0");
  const [edgeBanding, setEdgeBanding] = useState("0");
  const [technologist, setTechnologist] = useState("5");
  const [designer, setDesigner] = useState("5");
  const [assembly, setAssembly] = useState("0");
  const [delivery, setDelivery] = useState("0");
  const [profitType, setProfitType] = useState("COEF");
  const [profitValue, setProfitValue] = useState("1.0");

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/settings/service");
      const d: UserService = res.data;
      setData(d);
      setSawing(String(d.sawingPrice));
      setDrilling(String(d.drillingPrice));
      setEdgeBanding(String(d.edgeBandingPrice));
      setTechnologist(String(d.technologistPercent));
      setDesigner(String(d.designerPercent));
      setAssembly(String(d.assemblyPercent));
      setDelivery(String(d.deliveryPrice));
      setProfitType(d.profitType);
      setProfitValue(String(d.profitValue));
    } catch {
      toast.error(t("settings.loadServicesError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/settings/service", {
        sawingPrice: parseNum(sawing),
        drillingPrice: parseNum(drilling),
        edgeBandingPrice: parseNum(edgeBanding),
        technologistPercent: parseNum(technologist),
        designerPercent: parseNum(designer),
        assemblyPercent: parseNum(assembly),
        deliveryPrice: parseNum(delivery),
        profitType,
        profitValue: parseNum(profitValue),
      });
      toast.success(t("settings.servicesUpdated"));
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

  if (!data) {
    return (
      <p className="py-4 text-center text-muted-foreground">
        {t("settings.noServices")}
      </p>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t("settings.myServices")}
      </h2>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.sawing")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={sawing}
              onFocus={selectOnFocus}
              onChange={(e) => setSawing(e.target.value.replace(/\./g, ","))}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.drilling")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={drilling}
              onFocus={selectOnFocus}
              onChange={(e) => setDrilling(e.target.value.replace(/\./g, ","))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.edgeBanding")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={edgeBanding}
              onFocus={selectOnFocus}
              onChange={(e) =>
                setEdgeBanding(e.target.value.replace(/\./g, ","))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.delivery")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={delivery}
              onFocus={selectOnFocus}
              onChange={(e) => setDelivery(e.target.value.replace(/\./g, ","))}
            />
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.technologist")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={technologist}
              onFocus={selectOnFocus}
              onChange={(e) =>
                setTechnologist(e.target.value.replace(/\./g, ","))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.designer")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={designer}
              onFocus={selectOnFocus}
              onChange={(e) => setDesigner(e.target.value.replace(/\./g, ","))}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.assembly")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={assembly}
              onFocus={selectOnFocus}
              onChange={(e) => setAssembly(e.target.value.replace(/\./g, ","))}
            />
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.markupType")}</Label>
            <Select value={profitType} onValueChange={setProfitType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COEF">
                  {t("settings.serviceLabels.coefficient")}
                </SelectItem>
                <SelectItem value="FIXED">
                  {t("settings.serviceLabels.fixedPrice")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>
              {profitType === "COEF"
                ? t("settings.serviceLabels.coefficientLabel")
                : t("settings.serviceLabels.amountLabel")}
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              step={profitType === "COEF" ? "0.1" : "1"}
              value={profitValue}
              onFocus={selectOnFocus}
              onChange={(e) =>
                setProfitValue(e.target.value.replace(/\./g, ","))
              }
            />
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        <Save className="mr-1 h-4 w-4" />
        {t("common.save")}
      </Button>
    </div>
  );
}

/* ═══ COMPANY INFO ═══ */

interface CompanyInfo {
  id?: string;
  logo?: string | null;
  name: string;
  description?: string | null;
  descriptionKz?: string | null;
}

function CompanyInfoSection() {
  const t = useTranslations();
  const defaultDescription = t("settings.company.descriptionPlaceholder");
  const defaultDescriptionKz = t("settings.company.descriptionKzPlaceholder");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState(defaultDescription);
  const [descriptionKz, setDescriptionKz] = useState(defaultDescriptionKz);
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/settings/company");
      const data: CompanyInfo | null = res.data;
      if (data) {
        setName(data.name);
        setDescription(data.description?.trim() || defaultDescription);
        setDescriptionKz(data.descriptionKz?.trim() || defaultDescriptionKz);
        setLogo(data.logo ?? null);
      }
    } catch {
      // no company info yet — that's fine
    } finally {
      setLoading(false);
    }
  }, [defaultDescription, defaultDescriptionKz]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLogo(res.data.url);
      toast.success(t("settings.company.logoUploaded"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error(t("settings.company.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      await api.put("/settings/company", {
        name: name.trim(),
        logo: logo || undefined,
        description: description.trim() || undefined,
        descriptionKz: descriptionKz.trim() || undefined,
      });
      toast.success(t("settings.company.saved"));
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
    <div className="max-w-lg space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t("settings.company.title")}
      </h2>
      <div className="grid gap-3">
        {/* Logo */}
        <div className="space-y-2">
          <Label>{t("settings.company.logo")}</Label>
          <div className="flex items-center gap-3">
            {logo ? (
              <div className="relative">
                <Image
                  src={`${API_BASE_URL}${logo}`}
                  alt="Logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-md object-contain border"
                />
                <button
                  type="button"
                  onClick={() => setLogo(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground hover:bg-destructive/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </label>
            )}
            {uploading && <Spinner className="h-4 w-4" />}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <Label>{t("settings.company.name")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("settings.company.namePlaceholder")}
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label>{t("settings.company.description")}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("settings.company.descriptionPlaceholder")}
            rows={3}
          />
        </div>

        {/* Description KZ */}
        <div className="space-y-1">
          <Label>{t("settings.company.descriptionKz")}</Label>
          <Textarea
            value={descriptionKz}
            onChange={(e) => setDescriptionKz(e.target.value)}
            placeholder={t("settings.company.descriptionKzPlaceholder")}
            rows={3}
          />
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        <Save className="mr-1 h-4 w-4" />
        {t("common.save")}
      </Button>
    </div>
  );
}

/* ═══ PAYMENT STAGES ═══ */

function PaymentStagesSection() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<number[]>([20, 20, 20, 20, 20]);
  const [notes, setNotes] = useState<string[]>(["", "", "", "", ""]);
  const [locked, setLocked] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/settings/payment-stages");
      const data: { stageNumber: number; percentage: number; note?: string }[] =
        res.data;
      if (data.length > 0) {
        const arr = [0, 0, 0, 0, 0];
        const notesArr = ["", "", "", "", ""];
        data.forEach((s) => {
          if (s.stageNumber >= 1 && s.stageNumber <= 5) {
            arr[s.stageNumber - 1] = s.percentage;
            notesArr[s.stageNumber - 1] = s.note ?? "";
          }
        });
        setStages(arr);
        setNotes(notesArr);
        setLocked(
          new Set(arr.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0)),
        );
      }
    } catch {
      // keep defaults 20/20/20/20/20
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = stages.reduce((s, v) => s + v, 0);
  const isComplete = total === 100;

  const isDisabled = (idx: number) => {
    // Disable if this input is not locked AND the sum of locked inputs already = 100
    if (locked.has(idx)) return false;
    const lockedSum = [0, 1, 2, 3, 4].reduce(
      (s, i) => (locked.has(i) ? s + stages[i] : s),
      0,
    );
    if (lockedSum >= 100) return true;
    return total >= 100 && stages[idx] === 0;
  };

  const handleChange = (idx: number, rawVal: string) => {
    const clean = rawVal.replace(/\D/g, "");
    let num = parseInt(clean) || 0;
    if (num > 100) num = 100;

    let newLocked = new Set(locked);
    if (clean === "") {
      newLocked.delete(idx);
      num = 0;
    } else {
      newLocked.add(idx);
    }

    // If current value + other locked sum > 100, unlock others so this field gets priority
    const otherLockedSum = [0, 1, 2, 3, 4].reduce(
      (s, i) => (i !== idx && newLocked.has(i) ? s + stages[i] : s),
      0,
    );
    if (num + otherLockedSum > 100) {
      newLocked = new Set(clean !== "" ? [idx] : []);
    }

    const newStages = [...stages];
    newStages[idx] = num;

    // Redistribute remaining among unlocked inputs
    const unlockedIndices = [0, 1, 2, 3, 4].filter((i) => !newLocked.has(i));
    if (unlockedIndices.length > 0) {
      const lockedSum = [0, 1, 2, 3, 4].reduce(
        (s, i) => (newLocked.has(i) ? s + newStages[i] : s),
        0,
      );
      const remaining = Math.max(0, 100 - lockedSum);
      const base = Math.floor(remaining / unlockedIndices.length);
      const extra = remaining - base * unlockedIndices.length;
      unlockedIndices.forEach((ui, j) => {
        newStages[ui] = base + (j < extra ? 1 : 0);
      });
    }

    setLocked(newLocked);
    setStages(newStages);
  };

  const save = async () => {
    if (!isComplete) {
      toast.error(t("settings.paymentStages.sumError"));
      return;
    }
    setSaving(true);
    try {
      const stagesData = stages
        .map((v, i) => ({
          stageNumber: i + 1,
          percentage: v,
          note: notes[i]?.trim() || undefined,
        }))
        .filter((s) => s.percentage > 0);

      await api.put("/settings/payment-stages", { stages: stagesData });
      toast.success(t("settings.paymentStages.saved"));
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
    <div className="max-w-lg space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t("settings.paymentStages.title")}
      </h2>
      <div className="grid gap-3">
        {stages.map((val, idx) => (
          <div key={idx} className="rounded-md border p-3">
            <div className="mb-2 flex items-center gap-3">
              <Label className="w-20 shrink-0">
                {t("settings.paymentStages.stage")} {idx + 1}
              </Label>
              <div className="relative flex-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={val === 0 ? "" : String(val)}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onFocus={selectOnFocus}
                  disabled={isDisabled(idx)}
                  placeholder="0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            <Input
              value={notes[idx]}
              onChange={(e) =>
                setNotes((prev) => {
                  const next = [...prev];
                  next[idx] = e.target.value;
                  return next;
                })
              }
              disabled={isDisabled(idx)}
              placeholder={t("settings.paymentStages.notePlaceholder")}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {t("settings.paymentStages.total")}:
        </span>
        <span
          className={`font-semibold ${isComplete ? "text-green-600" : "text-amber-600"}`}
        >
          {total}%
        </span>
        {isComplete && <span className="text-green-600">✓</span>}
      </div>
      <Button
        onClick={save}
        disabled={saving || !isComplete}
        className="w-full"
      >
        <Save className="mr-1 h-4 w-4" />
        {t("common.save")}
      </Button>
    </div>
  );
}

/* ═══ CONTACTS ═══ */

const CONTACT_TYPES = [
  "WHATSAPP",
  "TELEGRAM",
  "EMAIL",
  "INSTAGRAM",
  "TIKTOK",
] as const;

type ContactType = (typeof CONTACT_TYPES)[number];

interface UserContactItem {
  id: string;
  type: ContactType;
  value: string;
}

const CONTACT_LABELS: Record<ContactType, string> = {
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  EMAIL: "Email",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

const CONTACT_PLACEHOLDERS: Record<ContactType, string> = {
  WHATSAPP: "+7 700 000 00 00",
  TELEGRAM: "@username",
  EMAIL: "email@example.com",
  INSTAGRAM: "@username",
  TIKTOK: "@username",
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  // always starts with 7
  let d = digits;
  if (d.length > 0 && d[0] !== "7") d = "7" + d;
  if (d.length === 0) return "";
  let result = "+7";
  if (d.length > 1) result += " " + d.slice(1, 4);
  if (d.length > 4) result += " " + d.slice(4, 7);
  if (d.length > 7) result += " " + d.slice(7, 9);
  if (d.length > 9) result += " " + d.slice(9, 11);
  return result;
}

function ContactsSection() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<UserContactItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState<ContactType>("WHATSAPP");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/settings/contacts");
      setContacts(res.data);
    } catch {
      // no contacts yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addContact = async () => {
    if (!newValue.trim()) {
      toast.error(t("settings.contacts.valueRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/settings/contacts", {
        type: newType,
        value: newValue.trim(),
      });
      setContacts((prev) => [...prev, res.data]);
      setDialogOpen(false);
      setNewValue("");
      setNewType("WHATSAPP");
      toast.success(t("settings.contacts.added"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  const removeContact = async (id: string) => {
    try {
      await api.delete(`/settings/contacts/${id}`);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success(t("settings.contacts.deleted"));
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("settings.contacts.title")}
        </h2>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          {t("settings.contacts.add")}
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("settings.contacts.empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  {CONTACT_LABELS[c.type]}
                </span>
                <span className="text-sm">{c.value}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeContact(c.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.contacts.addTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("settings.contacts.type")}</Label>
              <Select
                value={newType}
                onValueChange={(v) => {
                  setNewType(v as ContactType);
                  setNewValue("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {CONTACT_LABELS[ct]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("settings.contacts.value")}</Label>
              <Input
                value={newValue}
                onChange={(e) => {
                  if (newType === "WHATSAPP") {
                    setNewValue(formatPhone(e.target.value));
                  } else {
                    setNewValue(e.target.value);
                  }
                }}
                placeholder={CONTACT_PLACEHOLDERS[newType]}
              />
            </div>
            <Button onClick={addContact} disabled={saving} className="w-full">
              <Plus className="mr-1 h-4 w-4" />
              {t("settings.contacts.addBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
