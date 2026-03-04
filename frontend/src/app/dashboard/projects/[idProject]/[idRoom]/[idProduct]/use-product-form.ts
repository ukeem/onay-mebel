"use client";

import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import type { CountertopData, FalseFacadeItem } from "@/types";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type {
  ExtraItem,
  ExtraType,
  HwOption,
  MatOption,
  ProductData,
  SubItem,
  UserDefaults,
} from "./types";

export function useProductForm(
  idProject: string,
  idRoom: string,
  idProduct: string,
) {
  const router = useRouter();
  const t = useTranslations();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [materials, setMaterials] = useState<MatOption[]>([]);
  const [hardwareList, setHardwareList] = useState<HwOption[]>([]);
  const [extraTypes, setExtraTypes] = useState<ExtraType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  /* ── switchers ── */
  const [sectionsEnabled, setSectionsEnabled] = useState(false);
  const [partitionsEnabled, setPartitionsEnabled] = useState(false);
  const [shelvesEnabled, setShelvesEnabled] = useState(false);
  const [facadesEnabled, setFacadesEnabled] = useState(false);
  const [falseFacadesEnabled, setFalseFacadesEnabled] = useState(false);
  const [drawersEnabled, setDrawersEnabled] = useState(false);
  const [countertopEnabled, setCountertopEnabled] = useState(false);
  const [extrasEnabled, setExtrasEnabled] = useState(false);

  /* ── sub items ── */
  const [sections, setSections] = useState<SubItem[]>([]);
  const [partitions, setPartitions] = useState<SubItem[]>([]);
  const [shelves, setShelves] = useState<SubItem[]>([]);
  const [facades, setFacades] = useState<SubItem[]>([]);
  const [falseFacades, setFalseFacades] = useState<FalseFacadeItem[]>([]);
  const [drawers, setDrawers] = useState<SubItem[]>([]);
  const [countertops, setCountertops] = useState<CountertopData[]>([]);
  const [extras, setExtras] = useState<ExtraItem[]>([]);

  /* ── default states (driven by last section) ── */
  const [defaultWidth, setDefaultWidth] = useState(1000);
  const [defaultHeight, setDefaultHeight] = useState(2000);
  const [defaultDepth, setDefaultDepth] = useState(600);
  const [defaultMaterialId, setDefaultMaterialId] = useState("");

  /* ── user defaults (from settings) ── */
  const [userDefaults, setUserDefaults] = useState<UserDefaults | null>(null);

  /* ref to skip tracking on initial load */
  const initialLoadDone = useRef(false);

  /* ── fetch ── */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const fetchData = useCallback(async () => {
    try {
      const [pRes, mRes, hwRes, etRes, defRes] = await Promise.all([
        api.get(`/products/${idProduct}`),
        api.get("/settings/materials"),
        api.get("/settings/hardware"),
        api.get("/catalog/extra-types"),
        api.get("/settings/defaults"),
      ]);
      const p: ProductData = pRes.data;
      const defaults: UserDefaults = defRes.data;
      setUserDefaults(defaults);
      setProduct(p);
      setExtraTypes(etRes.data);
      const enabledMaterials = (mRes.data as any[])
        .filter((um) => um.enabled !== false)
        .map((um) => um.material as MatOption);
      setMaterials(
        enabledMaterials.filter((m) => m.materialType.name !== "Кромка"),
      );
      // Transform UserHardware[] → HwOption[]
      setHardwareList(
        (hwRes.data as any[])
          .filter((uh) => uh.enabled !== false)
          .map((uh) => ({
            id: uh.hardware.id,
            brand: uh.hardware.brand,
            hardwareType: uh.hardware.hardwareType,
          })),
      );

      setSectionsEnabled(p.sectionsEnabled);
      setPartitionsEnabled(p.partitionsEnabled);
      setShelvesEnabled(p.shelvesEnabled);
      setFacadesEnabled(p.facadesEnabled);
      setFalseFacadesEnabled(p.falseFacadesEnabled);
      setDrawersEnabled(p.drawersEnabled);
      setCountertopEnabled(p.countertopEnabled);
      setExtrasEnabled(p.extrasEnabled);

      setSections(p.sections || []);

      /* initialize defaults from last section or user defaults */
      const secs = p.sections || [];
      if (secs.length > 0) {
        const last = secs[secs.length - 1];
        if (last.width) setDefaultWidth(last.width);
        if (last.height) setDefaultHeight(last.height);
        if (last.depth) setDefaultDepth(last.depth);
        if (last.materialId) setDefaultMaterialId(last.materialId);
      } else if (defaults.sectionMaterialId) {
        setDefaultMaterialId(defaults.sectionMaterialId);
      }
      initialLoadDone.current = true;

      setPartitions(p.partitions || []);
      setShelves(p.shelves || []);
      setFacades(p.facades || []);
      setFalseFacades(p.falseFacades || []);
      setDrawers(p.drawers || []);
      setCountertops(p.countertops || []);
      setExtras(p.extras || []);
    } catch {
      toast.error(t("product.loadError"));
    } finally {
      setLoading(false);
    }
  }, [idProduct, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── stable callbacks ── */
  const clearError = useCallback((...keys: string[]) => {
    setErrors((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next.size === prev.size ? prev : next;
    });
  }, []);

  const togglePartitions = useCallback((v: boolean) => {
    setPartitionsEnabled(v);
    if (!v) setPartitions([]);
  }, []);
  const toggleShelves = useCallback((v: boolean) => {
    setShelvesEnabled(v);
    if (!v) setShelves([]);
  }, []);
  const toggleDrawers = useCallback((v: boolean) => {
    setDrawersEnabled(v);
    if (!v) setDrawers([]);
  }, []);
  const toggleFacades = useCallback((v: boolean) => {
    setFacadesEnabled(v);
    if (!v) setFacades([]);
  }, []);
  const toggleFalseFacades = useCallback((v: boolean) => {
    setFalseFacadesEnabled(v);
    if (!v) setFalseFacades([]);
  }, []);
  const toggleExtras = useCallback((v: boolean) => {
    setExtrasEnabled(v);
    if (!v) setExtras([]);
  }, []);
  /* section setter that tracks defaults */
  const setSectionsTracked = useCallback(
    (v: SubItem[] | ((prev: SubItem[]) => SubItem[])) => {
      setSections((prev) => {
        const next = typeof v === "function" ? v(prev) : v;
        if (initialLoadDone.current && next.length > 0) {
          const last = next[next.length - 1];
          if (last.width) setDefaultWidth(last.width);
          if (last.height) setDefaultHeight(last.height);
          if (last.depth) setDefaultDepth(last.depth);
          if (last.materialId) setDefaultMaterialId(last.materialId);
        }
        return next;
      });
    },
    [],
  );

  const toggleSections = useCallback((v: boolean) => {
    setSectionsEnabled(v);
    if (!v) setSections([]);
  }, []);

  /* facade setters with error clear */
  const setFacadesWithClear = useCallback(
    (v: SubItem[]) => {
      setFacades(v);
      clearError("facadeRequired", ...v.map((_, i) => `facadeMaterial_${i}`));
    },
    [clearError],
  );

  /* ── validate ── */
  const validate = (): string | null => {
    const e = new Set<string>();

    /* sections */
    if (sectionsEnabled) {
      sections.forEach((s, i) => {
        if (!s.materialId) e.add(`sectionMaterial_${i}`);
        if (s.backWallEnabled && !s.backWallMaterialId)
          e.add(`backWallMaterial_${i}`);
        if (s.legsEnabled && !s.legsHardwareId) e.add(`legsHardware_${i}`);
      });
    }
    /* partitions */
    if (partitionsEnabled) {
      partitions.forEach((p, i) => {
        if (!p.materialId) e.add(`partitionMaterial_${i}`);
      });
    }
    /* shelves */
    if (shelvesEnabled) {
      shelves.forEach((s, i) => {
        if (!s.materialId) e.add(`shelfMaterial_${i}`);
        if (holderHardware.length > 0 && !s.holderHardwareId)
          e.add(`shelfHolder_${i}`);
      });
    }
    /* facades */
    if (facadesEnabled) {
      if (facades.length === 0) e.add("facadeRequired");
      facades.forEach((f, i) => {
        if (!f.materialId) e.add(`facadeMaterial_${i}`);
        if (hingeHardware.length > 0 && !f.hingeHardwareId)
          e.add(`facadeHinge_${i}`);
        if ((f.openType ?? "HANDLE") === "HANDLE") {
          if (
            handleHardware.length > 0 &&
            (f.handleQty ?? 0) > 0 &&
            !f.handleHardwareId
          )
            e.add(`facadeHandle_${i}`);
        } else {
          if (tipOnHardware.length > 0 && !f.tipOnHardwareId)
            e.add(`facadeTipOn_${i}`);
        }
      });
    }
    /* false facades */
    if (falseFacadesEnabled) {
      falseFacades.forEach((ff, i) => {
        if (!ff.materialId) e.add(`falseFacadeMaterial_${i}`);
      });
    }
    /* drawers */
    if (drawersEnabled) {
      drawers.forEach((d, i) => {
        if (!d.materialId) e.add(`drawerMaterial_${i}`);
        const hwList =
          (d.slideType ?? "GUIDE") === "TANDEM"
            ? tandemHardware
            : slideHardware;
        if (hwList.length > 0 && !d.slideHardwareId) e.add(`drawerSlide_${i}`);
      });
    }
    /* countertops */
    if (countertopEnabled) {
      countertops.forEach((ct, i) => {
        if (!ct.materialId) e.add(`countertopMaterial_${i}`);
        if (ct.apronEnabled && !ct.apronMaterialId) e.add(`apronMaterial_${i}`);
      });
    }

    setErrors(e);
    if (e.size === 0) return null;

    /* return first human-readable message */
    for (const k of e) {
      if (k === "facadeRequired") return t("product.validation.facadeRequired");
      if (k.startsWith("sectionMaterial_"))
        return t("product.validation.bodyMaterial");
      if (k.startsWith("backWallMaterial_"))
        return t("product.validation.backWallMaterial");
      if (k.startsWith("legsHardware_"))
        return t("product.validation.legsHardware");
      if (k.startsWith("partitionMaterial_"))
        return t("product.validation.partitionMaterial");
      if (k.startsWith("shelfMaterial_"))
        return t("product.validation.shelfMaterial");
      if (k.startsWith("shelfHolder_"))
        return t("product.validation.shelfHolder");
      if (k.startsWith("facadeMaterial_"))
        return t("product.validation.facadeMaterial");
      if (k.startsWith("facadeHinge_"))
        return t("product.validation.facadeHinge");
      if (k.startsWith("facadeHandle_"))
        return t("product.validation.facadeHandle");
      if (k.startsWith("facadeTipOn_"))
        return t("product.validation.facadeTipOn");
      if (k.startsWith("falseFacadeMaterial_"))
        return t("product.validation.falseFacadeMaterial");
      if (k.startsWith("drawerMaterial_"))
        return t("product.validation.drawerMaterial");
      if (k.startsWith("drawerSlide_"))
        return t("product.validation.drawerSlide");
      if (k.startsWith("countertopMaterial_"))
        return t("product.validation.countertopMaterial");
      if (k.startsWith("apronMaterial_"))
        return t("product.validation.apronMaterial");
    }
    return null;
  };

  const hasError = useCallback(
    (key: string) => {
      if (!errors.has(key)) return false;
      const idx = parseInt(key.split("_").pop()!, 10);
      if (key.startsWith("countertopMaterial_"))
        return !countertops[idx]?.materialId;
      if (key.startsWith("apronMaterial_"))
        return !countertops[idx]?.apronMaterialId;
      return true;
    },
    [errors, countertops],
  );

  /* ── save all ── */
  const handleSave = async () => {
    const msg = validate();
    if (msg) {
      toast.error(msg);
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/products/${idProduct}`, {
        sectionsEnabled,
        partitionsEnabled,
        shelvesEnabled,
        facadesEnabled,
        falseFacadesEnabled,
        drawersEnabled,
        countertopEnabled,
        extrasEnabled,
      });

      const reqs: Promise<any>[] = [];

      if (sectionsEnabled) {
        reqs.push(
          api.put(
            `/products/${idProduct}/sections`,
            sections.map((s) => ({
              ...(s.id ? { id: s.id } : {}),
              label: s.label || null,
              qty: s.qty,
              width: s.width || 0,
              height: s.height || 0,
              depth: s.depth || 0,
              materialId: s.materialId || null,
              backWallEnabled: s.backWallEnabled || false,
              backWallMaterialId: s.backWallEnabled
                ? s.backWallMaterialId || null
                : null,
              legsEnabled: s.legsEnabled || false,
              legsHardwareId: s.legsEnabled ? s.legsHardwareId || null : null,
            })),
          ),
        );
      }
      if (partitionsEnabled) {
        reqs.push(
          api.put(
            `/products/${idProduct}/partitions`,
            partitions.map((p) => ({
              ...(p.id ? { id: p.id } : {}),
              label: p.label || null,
              qty: p.qty,
              height: p.height || 0,
              depth: p.depth || 0,
              materialId: p.materialId || null,
            })),
          ),
        );
      }
      if (shelvesEnabled) {
        reqs.push(
          api.put(
            `/products/${idProduct}/shelves`,
            shelves.map((s) => ({
              ...(s.id ? { id: s.id } : {}),
              label: s.label || null,
              qty: s.qty,
              width: s.width || 0,
              depth: s.depth || 0,
              materialId: s.materialId || null,
              holderHardwareId: s.holderHardwareId || null,
            })),
          ),
        );
      }
      if (facadesEnabled) {
        reqs.push(
          api.put(
            `/products/${idProduct}/facades`,
            facades.map((f) => ({
              ...(f.id ? { id: f.id } : {}),
              label: f.label || null,
              qty: f.qty,
              width: f.width || 0,
              height: f.height || 0,
              materialId: f.materialId || null,
              handleQty: f.handleQty || 0,
              openType: f.openType || "HANDLE",
              hingeHardwareId: f.hingeHardwareId || null,
              handleHardwareId: f.handleHardwareId || null,
              tipOnHardwareId: f.tipOnHardwareId || null,
            })),
          ),
        );
      }
      if (falseFacadesEnabled) {
        reqs.push(
          api.put(
            `/products/${idProduct}/false-facades`,
            falseFacades.map((ff) => ({
              ...(ff.id ? { id: ff.id } : {}),
              label: ff.label || null,
              qty: ff.qty,
              height: ff.height || 0,
              depth: ff.depth || 0,
              materialId: ff.materialId || null,
            })),
          ),
        );
      }
      if (drawersEnabled) {
        reqs.push(
          api.put(
            `/products/${idProduct}/drawers`,
            drawers.map((d) => ({
              ...(d.id ? { id: d.id } : {}),
              label: d.label || null,
              qty: d.qty,
              width: d.width || 0,
              height: d.height || 0,
              depth: d.depth || 0,
              materialId: d.materialId || null,
              handleQty: d.handleQty || 0,
              slideType: d.slideType || "GUIDE",
              slideHardwareId: d.slideHardwareId || null,
            })),
          ),
        );
      }
      if (countertopEnabled) {
        reqs.push(
          api.put(
            `/products/${idProduct}/countertops`,
            countertops.map((ct) => ({
              ...(ct.id ? { id: ct.id } : {}),
              label: ct.label || null,
              materialId: ct.materialId || null,
              width: ct.width || 0,
              depth: ct.depth || 0,
              apronEnabled: ct.apronEnabled || false,
              apronMaterialId: ct.apronEnabled
                ? ct.apronMaterialId || null
                : null,
              apronWidth: ct.apronWidth || null,
              apronHeight: ct.apronHeight || null,
            })),
          ),
        );
      }
      if (extrasEnabled) {
        reqs.push(api.put(`/products/${idProduct}/extras`, extras));
      }

      await Promise.all(reqs);
      toast.success(t("product.saved"));
      router.push(`/dashboard/projects/${idProject}/${idRoom}`);
    } catch (err: unknown) {
      toast.error(getApiError(err, t("product.saveError")));
    } finally {
      setSaving(false);
    }
  };

  /* ── computed ── */
  const facadeMaterials = useMemo(
    () =>
      materials.filter(
        (m) =>
          m.materialType.name !== "ХДФ" && m.materialType.name !== "Камень",
      ),
    [materials],
  );

  /* Материалы корпуса: без Камня и ХДФ */
  const bodyMaterials = useMemo(
    () =>
      materials.filter(
        (m) =>
          m.materialType.name !== "Камень" && m.materialType.name !== "ХДФ",
      ),
    [materials],
  );

  /* Задняя стенка: ХДФ + ЛДСП + МДФ */
  const backWallMaterials = useMemo(
    () =>
      materials.filter((m) =>
        ["ХДФ", "ЛДСП", "МДФ"].includes(m.materialType.name),
      ),
    [materials],
  );

  /* Столешница: Камень + ЛДСП + МДФ */
  const countertopMaterials = useMemo(
    () =>
      materials.filter((m) =>
        ["Камень", "ЛДСП", "МДФ"].includes(m.materialType.name),
      ),
    [materials],
  );

  const facadeErrorKeys = useMemo(() => {
    const s = new Set<string>();
    errors.forEach((k) => {
      const idx = parseInt(k.split("_").pop()!, 10);
      const f = facades[idx];
      if (k.startsWith("facadeMaterial_") && f && !f.materialId)
        s.add(`mat_${idx}`);
      if (k.startsWith("facadeHinge_") && f && !f.hingeHardwareId)
        s.add(`hinge_${idx}`);
      if (k.startsWith("facadeHandle_") && f && !f.handleHardwareId)
        s.add(`handle_${idx}`);
      if (k.startsWith("facadeTipOn_") && f && !f.tipOnHardwareId)
        s.add(`tipOn_${idx}`);
    });
    return s;
  }, [errors, facades]);

  /* error sets for editors */
  const sectionErrors = useMemo(() => {
    const s = new Set<string>();
    errors.forEach((k) => {
      const idx = parseInt(k.split("_").pop()!, 10);
      const sec = sections[idx];
      if (k.startsWith("sectionMaterial_") && sec && !sec.materialId) s.add(k);
      if (k.startsWith("backWallMaterial_") && sec && !sec.backWallMaterialId)
        s.add(k);
      if (k.startsWith("legsHardware_") && sec && !sec.legsHardwareId) s.add(k);
    });
    return s;
  }, [errors, sections]);

  const partitionErrors = useMemo(() => {
    const s = new Set<string>();
    errors.forEach((k) => {
      const idx = parseInt(k.split("_").pop()!, 10);
      if (
        k.startsWith("partitionMaterial_") &&
        partitions[idx] &&
        !partitions[idx].materialId
      )
        s.add(`mat_${idx}`);
    });
    return s;
  }, [errors, partitions]);

  const shelfErrors = useMemo(() => {
    const s = new Set<string>();
    errors.forEach((k) => {
      const idx = parseInt(k.split("_").pop()!, 10);
      const sh = shelves[idx];
      if (k.startsWith("shelfMaterial_") && sh && !sh.materialId)
        s.add(`mat_${idx}`);
      if (k.startsWith("shelfHolder_") && sh && !sh.holderHardwareId)
        s.add(`hw_${idx}`);
    });
    return s;
  }, [errors, shelves]);

  const falseFacadeErrors = useMemo(() => {
    const s = new Set<string>();
    errors.forEach((k) => {
      const idx = parseInt(k.split("_").pop()!, 10);
      if (
        k.startsWith("falseFacadeMaterial_") &&
        falseFacades[idx] &&
        !falseFacades[idx].materialId
      )
        s.add(`mat_${idx}`);
    });
    return s;
  }, [errors, falseFacades]);

  const drawerErrors = useMemo(() => {
    const s = new Set<string>();
    errors.forEach((k) => {
      const idx = parseInt(k.split("_").pop()!, 10);
      const dr = drawers[idx];
      if (k.startsWith("drawerMaterial_") && dr && !dr.materialId)
        s.add(`mat_${idx}`);
      if (k.startsWith("drawerSlide_") && dr && !dr.slideHardwareId)
        s.add(`hw_${idx}`);
    });
    return s;
  }, [errors, drawers]);

  /* ── hardware filtered by type ── */
  const legsHardware = useMemo(
    () => hardwareList.filter((h) => h.hardwareType.name === "Ножки"),
    [hardwareList],
  );
  const hingeHardware = useMemo(
    () => hardwareList.filter((h) => h.hardwareType.name === "Петли"),
    [hardwareList],
  );
  const holderHardware = useMemo(
    () => hardwareList.filter((h) => h.hardwareType.name === "Полкодержатели"),
    [hardwareList],
  );
  const slideHardware = useMemo(
    () => hardwareList.filter((h) => h.hardwareType.name === "Телескоп"),
    [hardwareList],
  );
  const tandemHardware = useMemo(
    () => hardwareList.filter((h) => h.hardwareType.name === "Тандем"),
    [hardwareList],
  );
  const handleHardware = useMemo(
    () => hardwareList.filter((h) => h.hardwareType.name === "Ручки"),
    [hardwareList],
  );
  const tipOnHardware = useMemo(
    () => hardwareList.filter((h) => h.hardwareType.name === "Tip-On"),
    [hardwareList],
  );

  return {
    /* data */
    product,
    materials,
    loading,
    saving,
    t,

    /* toggles */
    sectionsEnabled,
    partitionsEnabled,
    shelvesEnabled,
    facadesEnabled,
    falseFacadesEnabled,
    drawersEnabled,
    countertopEnabled,
    extrasEnabled,

    /* sub items */
    sections,
    setSections: setSectionsTracked,
    partitions,
    setPartitions,
    shelves,
    setShelves,
    facades,
    falseFacades,
    setFalseFacades,
    drawers,
    setDrawers,
    countertops,
    setCountertops,
    extras,
    setExtras,
    extraTypes,

    /* defaults from last section */
    defaultWidth,
    defaultHeight,
    defaultDepth,
    defaultMaterialId,

    /* user defaults (resolved from settings) */
    userDefaults,

    /* toggle callbacks */
    toggleSections,
    togglePartitions,
    toggleShelves,
    toggleDrawers,
    toggleFacades,
    toggleFalseFacades,
    toggleExtras,
    setCountertopEnabled,

    /* facade setters */
    setFacadesWithClear,

    /* validation & save */
    hasError,
    clearError,
    handleSave,

    /* computed */
    facadeMaterials,
    bodyMaterials,
    backWallMaterials,
    countertopMaterials,
    facadeErrorKeys,
    sectionErrors,
    partitionErrors,
    shelfErrors,
    falseFacadeErrors,
    drawerErrors,

    /* hardware */
    legsHardware,
    hingeHardware,
    holderHardware,
    slideHardware,
    tandemHardware,
    handleHardware,
    tipOnHardware,
  };
}
