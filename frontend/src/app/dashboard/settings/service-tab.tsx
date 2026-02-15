"use client";

import { Button } from "@/components/ui/button";
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
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { selectOnFocus } from "@/lib/utils";
import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";

import type { UserService } from "./types";

export function UserServiceTab() {
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
        sawingPrice: parseFloat(sawing),
        drillingPrice: parseFloat(drilling),
        edgeBandingPrice: parseFloat(edgeBanding),
        technologistPercent: parseFloat(technologist),
        designerPercent: parseFloat(designer),
        assemblyPercent: parseFloat(assembly),
        deliveryPrice: parseFloat(delivery),
        profitType,
        profitValue: parseFloat(profitValue),
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
              type="number"
              value={sawing}
              onFocus={selectOnFocus}
              onChange={(e) => setSawing(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.drilling")}</Label>
            <Input
              type="number"
              value={drilling}
              onFocus={selectOnFocus}
              onChange={(e) => setDrilling(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.edgeBanding")}</Label>
            <Input
              type="number"
              value={edgeBanding}
              onFocus={selectOnFocus}
              onChange={(e) => setEdgeBanding(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.delivery")}</Label>
            <Input
              type="number"
              value={delivery}
              onFocus={selectOnFocus}
              onChange={(e) => setDelivery(e.target.value)}
            />
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.technologist")}</Label>
            <Input
              type="number"
              value={technologist}
              onFocus={selectOnFocus}
              onChange={(e) => setTechnologist(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.designer")}</Label>
            <Input
              type="number"
              value={designer}
              onFocus={selectOnFocus}
              onChange={(e) => setDesigner(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.assembly")}</Label>
            <Input
              type="number"
              value={assembly}
              onFocus={selectOnFocus}
              onChange={(e) => setAssembly(e.target.value)}
            />
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.markupType")}</Label>
            <Select value={profitType} onValueChange={setProfitType}>
              <SelectTrigger>
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
              type="number"
              step={profitType === "COEF" ? "0.1" : "1"}
              value={profitValue}
              onFocus={selectOnFocus}
              onChange={(e) => setProfitValue(e.target.value)}
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
