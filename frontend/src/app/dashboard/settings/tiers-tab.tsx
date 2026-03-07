"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Spinner } from "@/components/ui/spinner";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { RotateCcw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { UserHardware, UserMaterial } from "@/types";

interface TierPref {
  tier: "STANDARD" | "PREMIUM";
  materialTypeId?: string;
  materialId?: string;
  hardwareTypeId?: string;
  hardwareId?: string;
  materialType?: { id: string; name: string };
  material?: { id: string; materialType: { name: string } };
  hardwareType?: { id: string; name: string };
  hardware?: { id: string; hardwareType: { name: string } };
}

type Selections = Record<string, string>; // key = `${tier}:mat:${typeId}` or `${tier}:hw:${typeId}` → id

export function TiersTab() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState<UserMaterial[]>([]);
  const [hardware, setHardware] = useState<UserHardware[]>([]);
  const [selections, setSelections] = useState<Selections>({});

  const fetchData = useCallback(async () => {
    try {
      const [matRes, hwRes, prefRes] = await Promise.all([
        api.get("/settings/materials"),
        api.get("/settings/hardware"),
        api.get("/settings/tier-preferences"),
      ]);

      const mats: UserMaterial[] = (matRes.data as UserMaterial[]).filter(
        (um) => um.material && um.enabled,
      );
      const hws: UserHardware[] = (hwRes.data as UserHardware[]).filter(
        (uh) => uh.hardware && uh.enabled,
      );
      setMaterials(mats);
      setHardware(hws);

      // Build selections from existing preferences
      const sel: Selections = {};
      for (const pref of prefRes.data as TierPref[]) {
        const tierKey = pref.tier === "STANDARD" ? "standard" : "premium";
        if (pref.materialTypeId && pref.materialId) {
          sel[`${tierKey}:mat:${pref.materialTypeId}`] = pref.materialId;
        }
        if (pref.hardwareTypeId && pref.hardwareId) {
          sel[`${tierKey}:hw:${pref.hardwareTypeId}`] = pref.hardwareId;
        }
      }
      setSelections(sel);
    } catch (err) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group materials by materialType
  const matGroups = useMemo(() => {
    const map = new Map<
      string,
      { typeId: string; typeName: string; items: UserMaterial[] }
    >();
    for (const um of materials) {
      const mt = um.material.materialType as { id?: string; name: string };
      const typeName = mt?.name ?? "";
      const typeId = mt?.id;
      if (!typeName || !typeId) continue;
      if (!map.has(typeId)) {
        map.set(typeId, { typeId, typeName, items: [] });
      }
      map.get(typeId)!.items.push(um);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.typeName.localeCompare(b.typeName, "ru"),
    );
  }, [materials]);

  // Group hardware by hardwareType
  const hwGroups = useMemo(() => {
    const map = new Map<
      string,
      { typeId: string; typeName: string; items: UserHardware[] }
    >();
    for (const uh of hardware) {
      const ht = uh.hardware.hardwareType as { id?: string; name: string };
      const typeName = ht?.name ?? "";
      const typeId = ht?.id;
      if (!typeName || !typeId) continue;
      if (!map.has(typeId)) {
        map.set(typeId, { typeId, typeName, items: [] });
      }
      map.get(typeId)!.items.push(uh);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.typeName.localeCompare(b.typeName, "ru"),
    );
  }, [hardware]);

  const handleSelect = (key: string, value: string) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const handleReset = () => {
    setSelections({});
  };

  const handleResetGroup = (kind: "mat" | "hw", typeId: string) => {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[`standard:${kind}:${typeId}`];
      delete next[`premium:${kind}:${typeId}`];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items: {
        tier: "STANDARD" | "PREMIUM";
        materialTypeId?: string;
        materialId?: string;
        hardwareTypeId?: string;
        hardwareId?: string;
      }[] = [];

      for (const [key, id] of Object.entries(selections)) {
        if (!id) continue;
        const [tier, kind, typeId] = key.split(":");
        const tierEnum = tier === "standard" ? "STANDARD" : "PREMIUM";
        if (kind === "mat") {
          items.push({
            tier: tierEnum,
            materialTypeId: typeId,
            materialId: id,
          });
        } else {
          items.push({
            tier: tierEnum,
            hardwareTypeId: typeId,
            hardwareId: id,
          });
        }
      }

      await api.put("/settings/tier-preferences", { items });
      toast.success(t("settings.tiers.saved"));
    } catch (err) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasAny = matGroups.length > 0 || hwGroups.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("settings.tiers.description")}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={Object.keys(selections).length === 0}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t("settings.tiers.reset")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>

      {!hasAny ? (
        <p className="text-center py-8 text-muted-foreground">
          {t("settings.noMaterials")}
        </p>
      ) : (
        <div className="space-y-6">
          {/* Materials */}
          {matGroups.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t("settings.materials")}</h3>
              {matGroups.map((group) => (
                <Card key={group.typeId} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{group.typeName}</Badge>
                    <button
                      type="button"
                      onClick={() => handleResetGroup("mat", group.typeId)}
                      disabled={
                        !selections[`standard:mat:${group.typeId}`] &&
                        !selections[`premium:mat:${group.typeId}`]
                      }
                      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        {t("settings.tiers.standard")}
                      </span>
                      <SearchableSelect
                        value={selections[`standard:mat:${group.typeId}`] ?? ""}
                        onChange={(v) =>
                          handleSelect(`standard:mat:${group.typeId}`, v)
                        }
                        options={group.items.map((um) => ({
                          value: um.material.id,
                          label: `${um.material.brand ?? "—"} (${Number(um.price).toLocaleString("ru-RU")} ₸)`,
                        }))}
                        placeholder={t("settings.tiers.autoMin")}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        {t("settings.tiers.premium")}
                      </span>
                      <SearchableSelect
                        value={selections[`premium:mat:${group.typeId}`] ?? ""}
                        onChange={(v) =>
                          handleSelect(`premium:mat:${group.typeId}`, v)
                        }
                        options={group.items.map((um) => ({
                          value: um.material.id,
                          label: `${um.material.brand ?? "—"} (${Number(um.price).toLocaleString("ru-RU")} ₸)`,
                        }))}
                        placeholder={t("settings.tiers.autoMax")}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Hardware */}
          {hwGroups.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t("settings.hardware")}</h3>
              {hwGroups.map((group) => (
                <Card key={group.typeId} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{group.typeName}</Badge>
                    <button
                      type="button"
                      onClick={() => handleResetGroup("hw", group.typeId)}
                      disabled={
                        !selections[`standard:hw:${group.typeId}`] &&
                        !selections[`premium:hw:${group.typeId}`]
                      }
                      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        {t("settings.tiers.standard")}
                      </span>
                      <SearchableSelect
                        value={selections[`standard:hw:${group.typeId}`] ?? ""}
                        onChange={(v) =>
                          handleSelect(`standard:hw:${group.typeId}`, v)
                        }
                        options={group.items.map((uh) => ({
                          value: uh.hardware.id,
                          label: `${uh.hardware.brand ?? "—"} (${Number(uh.price).toLocaleString("ru-RU")} ₸)`,
                        }))}
                        placeholder={t("settings.tiers.autoMin")}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        {t("settings.tiers.premium")}
                      </span>
                      <SearchableSelect
                        value={selections[`premium:hw:${group.typeId}`] ?? ""}
                        onChange={(v) =>
                          handleSelect(`premium:hw:${group.typeId}`, v)
                        }
                        options={group.items.map((uh) => ({
                          value: uh.hardware.id,
                          label: `${uh.hardware.brand ?? "—"} (${Number(uh.price).toLocaleString("ru-RU")} ₸)`,
                        }))}
                        placeholder={t("settings.tiers.autoMax")}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
