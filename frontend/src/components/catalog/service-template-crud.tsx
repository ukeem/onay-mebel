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
import { Spinner } from "@/components/ui/spinner";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { selectOnFocus } from "@/lib/utils";
import { RefreshCw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ServiceTemplate {
  id: string;
  sawingPrice: string;
  drillingPrice: string;
  edgeBandingPrice: string;
  technologistPercent: string;
  designerPercent: string;
  assemblyPercent: string;
  deliveryPrice: string;
  profitType: "COEF" | "FIXED";
  profitValue: string;
}

export function ServiceTemplateCrud() {
  const t = useTranslations();
  const [data, setData] = useState<ServiceTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sawingPrice, setSawingPrice] = useState("0");
  const [drillingPrice, setDrillingPrice] = useState("0");
  const [edgeBandingPrice, setEdgeBandingPrice] = useState("0");
  const [technologistPercent, setTechnologistPercent] = useState("5");
  const [designerPercent, setDesignerPercent] = useState("5");
  const [assemblyPercent, setAssemblyPercent] = useState("0");
  const [deliveryPrice, setDeliveryPrice] = useState("0");
  const [profitType, setProfitType] = useState("COEF");
  const [profitValue, setProfitValue] = useState("1.0");

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/catalog/service-template");
      const d = res.data;
      setData(d);
      setSawingPrice(String(d.sawingPrice));
      setDrillingPrice(String(d.drillingPrice));
      setEdgeBandingPrice(String(d.edgeBandingPrice));
      setTechnologistPercent(String(d.technologistPercent));
      setDesignerPercent(String(d.designerPercent));
      setAssemblyPercent(String(d.assemblyPercent));
      setDeliveryPrice(String(d.deliveryPrice));
      setProfitType(d.profitType);
      setProfitValue(String(d.profitValue));
    } catch {
      toast.error(t("catalog.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/catalog/service-template", {
        sawingPrice: parseFloat(sawingPrice),
        drillingPrice: parseFloat(drillingPrice),
        edgeBandingPrice: parseFloat(edgeBandingPrice),
        technologistPercent: parseFloat(technologistPercent),
        designerPercent: parseFloat(designerPercent),
        assemblyPercent: parseFloat(assemblyPercent),
        deliveryPrice: parseFloat(deliveryPrice),
        profitType,
        profitValue: parseFloat(profitValue),
      });
      toast.success(t("catalog.serviceUpdated"));
      fetch();
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-center text-muted-foreground">
        {t("catalog.serviceNotFound")}
      </p>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("catalog.serviceTemplate")}
        </h2>
        <Button size="sm" variant="ghost" onClick={fetch}>
          <RefreshCw className="mr-1 h-3 w-3" />
          {t("common.update")}
        </Button>
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.sawing")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={sawingPrice}
              onFocus={selectOnFocus}
              onChange={(e) => setSawingPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.drilling")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={drillingPrice}
              onFocus={selectOnFocus}
              onChange={(e) => setDrillingPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.edgeBanding")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={edgeBandingPrice}
              onFocus={selectOnFocus}
              onChange={(e) => setEdgeBandingPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.delivery")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={deliveryPrice}
              onFocus={selectOnFocus}
              onChange={(e) => setDeliveryPrice(e.target.value)}
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
              value={technologistPercent}
              onFocus={selectOnFocus}
              onChange={(e) => setTechnologistPercent(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.designer")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={designerPercent}
              onFocus={selectOnFocus}
              onChange={(e) => setDesignerPercent(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("settings.serviceLabels.assembly")}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={assemblyPercent}
              onFocus={selectOnFocus}
              onChange={(e) => setAssemblyPercent(e.target.value)}
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
              type="text"
              inputMode="decimal"
              step={profitType === "COEF" ? "0.1" : "1"}
              value={profitValue}
              onFocus={selectOnFocus}
              onChange={(e) => setProfitValue(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="mr-1 h-4 w-4" />
        {t("catalog.saveTemplate")}
      </Button>
    </div>
  );
}
