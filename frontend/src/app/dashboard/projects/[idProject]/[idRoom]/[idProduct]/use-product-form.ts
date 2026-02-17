"use client";

import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ExtraItem, MatOption, ProductData, SubItem } from "./types";
import { num } from "./types";

export function useProductForm(
  idProject: string,
  idRoom: string,
  idProduct: string,
) {
  const router = useRouter();
  const t = useTranslations();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [materials, setMaterials] = useState<MatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  /* ── local state mirrors ── */
  const [width, setWidth] = useState("0");
  const [height, setHeight] = useState("0");
  const [depth, setDepth] = useState("600");

  /* switchers */
  const [sectionsEnabled, setSectionsEnabled] = useState(false);
  const [backWallEnabled, setBackWallEnabled] = useState(false);
  const [backWallMaterialId, setBackWallMaterialId] = useState("");
  const [partitionsEnabled, setPartitionsEnabled] = useState(false);
  const [shelvesEnabled, setShelvesEnabled] = useState(false);
  const [facadesEnabled, setFacadesEnabled] = useState(false);
  const [falseFacadesEnabled, setFalseFacadesEnabled] = useState(false);
  const [falseFacadeQty, setFalseFacadeQty] = useState("1");
  const [falseFacadeMaterialId, setFalseFacadeMaterialId] = useState("");
  const [drawersEnabled, setDrawersEnabled] = useState(false);
  const [mezzanineEnabled, setMezzanineEnabled] = useState(false);
  const [countertopEnabled, setCountertopEnabled] = useState(false);
  const [extrasEnabled, setExtrasEnabled] = useState(false);

  /* sub items */
  const [sectionsQty, setSectionsQty] = useState(1);
  const [partitions, setPartitions] = useState<SubItem[]>([]);
  const [shelves, setShelves] = useState<SubItem[]>([]);
  const [facades, setFacades] = useState<SubItem[]>([]);
  const [drawers, setDrawers] = useState<SubItem[]>([]);
  const [extras, setExtras] = useState<ExtraItem[]>([]);

  /* mezzanine */
  const [mezHeight, setMezHeight] = useState("400");
  const [mezSectionsEnabled, setMezSectionsEnabled] = useState(false);
  const [mezSectionsQty, setMezSectionsQty] = useState(1);
  const [mezPartitionsEnabled, setMezPartitionsEnabled] = useState(false);
  const [mezPartitions, setMezPartitions] = useState<SubItem[]>([]);
  const [mezShelvesEnabled, setMezShelvesEnabled] = useState(false);
  const [mezShelves, setMezShelves] = useState<SubItem[]>([]);
  const [mezFacadesEnabled, setMezFacadesEnabled] = useState(false);
  const [mezFacades, setMezFacades] = useState<SubItem[]>([]);
  const [mezDrawersEnabled, setMezDrawersEnabled] = useState(false);
  const [mezDrawers, setMezDrawers] = useState<SubItem[]>([]);
  const [mezBackWallEnabled, setMezBackWallEnabled] = useState(false);
  const [mezBackWallMaterialId, setMezBackWallMaterialId] = useState("");
  const [mezSameAsBody, setMezSameAsBody] = useState(true);
  const [mezBodyMaterialId, setMezBodyMaterialId] = useState("");
  const [mezFalseFacadesEnabled, setMezFalseFacadesEnabled] = useState(false);
  const [mezFalseFacadeQty, setMezFalseFacadeQty] = useState("1");
  const [mezFalseFacadeMaterialId, setMezFalseFacadeMaterialId] = useState("");

  /* countertop */
  const [ctMatId, setCtMatId] = useState("");
  const [ctWidth, setCtWidth] = useState("600");
  const [ctDepth, setCtDepth] = useState("600");
  const [ctApron, setCtApron] = useState(false);
  const [ctApronMatId, setCtApronMatId] = useState("");
  const [ctApronW, setCtApronW] = useState("0");
  const [ctApronH, setCtApronH] = useState("0");

  /* ── fetch ── */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const fetchData = useCallback(async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        api.get(`/products/${idProduct}`),
        api.get("/catalog/materials"),
      ]);
      const p: ProductData = pRes.data;
      setProduct(p);
      setMaterials(
        (mRes.data as MatOption[]).filter(
          (m) => m.materialType.name !== "Кромка",
        ),
      );
      setWidth(String(p.width));
      setHeight(String(p.height));
      setDepth(String(p.depth));
      setSectionsEnabled(p.sectionsEnabled);
      setBackWallEnabled(p.backWallEnabled);
      setBackWallMaterialId(p.backWallMaterialId || "");
      setPartitionsEnabled(p.partitionsEnabled);
      setShelvesEnabled(p.shelvesEnabled);
      setFacadesEnabled(p.facadesEnabled);
      setFalseFacadesEnabled(p.falseFacadesEnabled);
      setFalseFacadeQty(String(p.falseFacadeQty));
      setFalseFacadeMaterialId(p.falseFacadeMaterialId || "");
      setDrawersEnabled(p.drawersEnabled);
      setMezzanineEnabled(p.mezzanineEnabled);
      setCountertopEnabled(p.countertopEnabled);
      setExtrasEnabled(p.extrasEnabled);

      /* filter main body items (mezzanineId === null) */
      const mainSections = (p.sections || []).filter(
        (x: any) => !x.mezzanineId,
      );
      const mainPartitions = (p.partitions || []).filter(
        (x: any) => !x.mezzanineId,
      );
      const mainShelves = (p.shelves || []).filter((x: any) => !x.mezzanineId);
      const mainFacades = (p.facades || []).filter((x: any) => !x.mezzanineId);
      const mainDrawers = (p.drawers || []).filter((x: any) => !x.mezzanineId);

      setSectionsQty(
        mainSections.reduce((s: number, x: any) => s + x.qty, 0) || 1,
      );
      setPartitions(mainPartitions);
      setShelves(mainShelves);
      setFacades(mainFacades);
      setDrawers(mainDrawers);
      setExtras(p.extras || []);
      if (p.mezzanine) {
        setMezHeight(String(p.mezzanine.height));
        setMezSectionsEnabled(p.mezzanine.sectionsEnabled);
        setMezSectionsQty(
          (p.mezzanine.sections || []).reduce(
            (s: number, x: any) => s + x.qty,
            0,
          ) || 1,
        );
        setMezPartitionsEnabled(p.mezzanine.partitionsEnabled);
        setMezPartitions(p.mezzanine.partitions || []);
        setMezShelvesEnabled(p.mezzanine.shelvesEnabled);
        setMezShelves(p.mezzanine.shelves || []);
        setMezFacadesEnabled(p.mezzanine.facadesEnabled);
        setMezFacades(p.mezzanine.facades || []);
        setMezDrawersEnabled(p.mezzanine.drawersEnabled);
        setMezDrawers(p.mezzanine.drawers || []);
        setMezBackWallEnabled(p.mezzanine.backWallEnabled);
        setMezBackWallMaterialId(p.mezzanine.backWallMaterialId || "");
        setMezSameAsBody(!p.mezzanine.bodyMaterialId);
        setMezBodyMaterialId(p.mezzanine.bodyMaterialId || "");
        setMezFalseFacadesEnabled(p.mezzanine.falseFacadesEnabled);
        setMezFalseFacadeQty(String(p.mezzanine.falseFacadeQty || 0));
        setMezFalseFacadeMaterialId(p.mezzanine.falseFacadeMaterialId || "");
      }
      if (p.countertop) {
        setCtMatId(p.countertop.materialId);
        setCtWidth(String(p.countertop.width));
        setCtDepth(String(p.countertop.depth));
        setCtApron(p.countertop.apronEnabled);
        setCtApronMatId(p.countertop.apronMaterialId || "");
        setCtApronW(String(p.countertop.apronWidth || 0));
        setCtApronH(String(p.countertop.apronHeight || 0));
      }
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
  const toggleBackWall = useCallback((v: boolean) => {
    setBackWallEnabled(v);
    if (!v) setBackWallMaterialId("");
  }, []);
  const toggleFacades = useCallback((v: boolean) => {
    setFacadesEnabled(v);
    if (!v) setFacades([]);
  }, []);
  const toggleFalseFacades = useCallback((v: boolean) => {
    setFalseFacadesEnabled(v);
    if (!v) {
      setFalseFacadeQty("1");
      setFalseFacadeMaterialId("");
    }
  }, []);
  const toggleExtras = useCallback((v: boolean) => {
    setExtrasEnabled(v);
    if (!v) setExtras([]);
  }, []);

  /* mez toggles */
  const toggleMezPartitions = useCallback((v: boolean) => {
    setMezPartitionsEnabled(v);
    if (!v) setMezPartitions([]);
  }, []);
  const toggleMezShelves = useCallback((v: boolean) => {
    setMezShelvesEnabled(v);
    if (!v) setMezShelves([]);
  }, []);
  const toggleMezDrawers = useCallback((v: boolean) => {
    setMezDrawersEnabled(v);
    if (!v) setMezDrawers([]);
  }, []);
  const toggleMezBackWall = useCallback((v: boolean) => {
    setMezBackWallEnabled(v);
    if (!v) setMezBackWallMaterialId("");
  }, []);
  const toggleMezFacades = useCallback((v: boolean) => {
    setMezFacadesEnabled(v);
    if (!v) setMezFacades([]);
  }, []);
  const toggleMezFalseFacades = useCallback((v: boolean) => {
    setMezFalseFacadesEnabled(v);
    if (!v) {
      setMezFalseFacadeQty("1");
      setMezFalseFacadeMaterialId("");
    }
  }, []);

  /* material change callbacks */
  const onBackWallMaterialChange = useCallback(
    (v: string) => {
      setBackWallMaterialId(v);
      clearError("backWallMaterial");
    },
    [clearError],
  );
  const onFalseFacadeMaterialChange = useCallback(
    (v: string) => {
      setFalseFacadeMaterialId(v);
      clearError("falseFacadeMaterial");
    },
    [clearError],
  );
  const onMezBackWallMaterialChange = useCallback(
    (v: string) => {
      setMezBackWallMaterialId(v);
      clearError("mezBackWallMaterial");
    },
    [clearError],
  );
  const onMezBodyMaterialChange = useCallback(
    (v: string) => {
      setMezBodyMaterialId(v);
      clearError("mezBodyMaterial");
    },
    [clearError],
  );
  const onMezFalseFacadeMaterialChange = useCallback(
    (v: string) => {
      setMezFalseFacadeMaterialId(v);
      clearError("mezFalseFacadeMaterial");
    },
    [clearError],
  );
  const onCtMaterialChange = useCallback(
    (v: string) => {
      setCtMatId(v);
      clearError("countertopMaterial");
    },
    [clearError],
  );
  const onApronMaterialChange = useCallback(
    (v: string) => {
      setCtApronMatId(v);
      clearError("apronMaterial");
    },
    [clearError],
  );

  /* setItems wrappers for facades (need clearError) */
  const setFacadesWithClear = useCallback(
    (v: SubItem[]) => {
      setFacades(v);
      clearError("facadeRequired", ...v.map((_, i) => `facadeMaterial_${i}`));
    },
    [clearError],
  );
  const setMezFacadesWithClear = useCallback(
    (v: SubItem[]) => {
      setMezFacades(v);
      clearError(
        "mezFacadeRequired",
        ...v.map((_, i) => `mezFacadeMaterial_${i}`),
      );
    },
    [clearError],
  );

  const onFalseFacadeQtyChange = useCallback(
    (v: number) => setFalseFacadeQty(String(v)),
    [],
  );
  const onMezFalseFacadeQtyChange = useCallback(
    (v: number) => setMezFalseFacadeQty(String(v)),
    [],
  );

  /* ── validate ── */
  const validate = (): string | null => {
    const e = new Set<string>();

    if (num(width) <= 0 || num(height) <= 0 || num(depth) <= 0)
      e.add("dimensions");
    if (backWallEnabled && !backWallMaterialId) e.add("backWallMaterial");
    if (facadesEnabled) {
      if (facades.length === 0) e.add("facadeRequired");
      facades.forEach((f, i) => {
        if (!f.isLdsp && !f.materialId) e.add(`facadeMaterial_${i}`);
      });
    }
    if (falseFacadesEnabled && !falseFacadeMaterialId)
      e.add("falseFacadeMaterial");
    if (countertopEnabled) {
      if (!ctMatId) e.add("countertopMaterial");
      if (ctApron && !ctApronMatId) e.add("apronMaterial");
    }
    if (mezzanineEnabled) {
      if (!mezSameAsBody && !mezBodyMaterialId) e.add("mezBodyMaterial");
      if (mezBackWallEnabled && !mezBackWallMaterialId)
        e.add("mezBackWallMaterial");
      if (mezFacadesEnabled) {
        if (mezFacades.length === 0) e.add("mezFacadeRequired");
        mezFacades.forEach((f, i) => {
          if (!f.isLdsp && !f.materialId) e.add(`mezFacadeMaterial_${i}`);
        });
      }
      if (mezFalseFacadesEnabled && !mezFalseFacadeMaterialId)
        e.add("mezFalseFacadeMaterial");
    }

    setErrors(e);
    if (e.size === 0) return null;

    const keyMap: Record<string, string> = {
      dimensions: t("product.validation.dimensions"),
      backWallMaterial: t("product.validation.backWallMaterial"),
      facadeRequired: t("product.validation.facadeRequired"),
      falseFacadeMaterial: t("product.validation.falseFacadeMaterial"),
      countertopMaterial: t("product.validation.countertopMaterial"),
      apronMaterial: t("product.validation.apronMaterial"),
      mezBodyMaterial: t("product.validation.mezBodyMaterial"),
      mezBackWallMaterial: t("product.validation.mezBackWallMaterial"),
      mezFacadeRequired: t("product.validation.mezFacadeRequired"),
      mezFalseFacadeMaterial: t("product.validation.mezFalseFacadeMaterial"),
    };
    for (const k of e) {
      if (keyMap[k]) return keyMap[k];
      if (k.startsWith("facadeMaterial_"))
        return t("product.validation.facadeMaterial");
      if (k.startsWith("mezFacadeMaterial_"))
        return t("product.validation.mezFacadeMaterial");
    }
    return null;
  };

  const hasError = (key: string) => errors.has(key);

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
        width: num(width),
        height: num(height),
        depth: num(depth),
        sectionsEnabled,
        backWallEnabled,
        backWallMaterialId: backWallEnabled ? backWallMaterialId || null : null,
        partitionsEnabled,
        shelvesEnabled,
        facadesEnabled,
        falseFacadesEnabled,
        falseFacadeQty: num(falseFacadeQty),
        falseFacadeMaterialId: falseFacadesEnabled
          ? falseFacadeMaterialId || null
          : null,
        drawersEnabled,
        mezzanineEnabled,
        countertopEnabled,
        extrasEnabled,
      });

      const reqs: Promise<any>[] = [];

      if (sectionsEnabled) {
        reqs.push(
          api.put(`/products/${idProduct}/sections`, [{ qty: sectionsQty }]),
        );
      }
      if (partitionsEnabled) {
        reqs.push(api.put(`/products/${idProduct}/partitions`, partitions));
      }
      if (shelvesEnabled) {
        reqs.push(api.put(`/products/${idProduct}/shelves`, shelves));
      }
      if (facadesEnabled) {
        reqs.push(
          api.put(
            `/products/${idProduct}/facades`,
            facades.map((f) => ({
              ...f,
              materialId: f.isLdsp ? null : f.materialId || null,
            })),
          ),
        );
      }
      if (drawersEnabled) {
        reqs.push(api.put(`/products/${idProduct}/drawers`, drawers));
      }
      if (extrasEnabled) {
        reqs.push(api.put(`/products/${idProduct}/extras`, extras));
      }

      if (mezzanineEnabled) {
        const mezRes = await api.put(`/products/${idProduct}/mezzanine`, {
          height: num(mezHeight),
          bodyMaterialId: mezSameAsBody ? null : mezBodyMaterialId || null,
          sectionsEnabled: mezSectionsEnabled,
          partitionsEnabled: mezPartitionsEnabled,
          shelvesEnabled: mezShelvesEnabled,
          facadesEnabled: mezFacadesEnabled,
          drawersEnabled: mezDrawersEnabled,
          backWallEnabled: mezBackWallEnabled,
          backWallMaterialId: mezBackWallEnabled
            ? mezBackWallMaterialId || null
            : null,
          falseFacadesEnabled: mezFalseFacadesEnabled,
          falseFacadeQty: num(mezFalseFacadeQty),
          falseFacadeMaterialId: mezFalseFacadesEnabled
            ? mezFalseFacadeMaterialId || null
            : null,
        });
        const mezId = mezRes.data.id;
        if (mezSectionsEnabled) {
          reqs.push(
            api.put(`/products/${idProduct}/sections`, [
              { qty: mezSectionsQty, mezzanineId: mezId },
            ]),
          );
        }
        if (mezPartitionsEnabled && mezPartitions.length > 0) {
          reqs.push(
            api.put(
              `/products/${idProduct}/partitions`,
              mezPartitions.map((s) => ({ ...s, mezzanineId: mezId })),
            ),
          );
        }
        if (mezShelvesEnabled && mezShelves.length > 0) {
          reqs.push(
            api.put(
              `/products/${idProduct}/shelves`,
              mezShelves.map((s) => ({ ...s, mezzanineId: mezId })),
            ),
          );
        }
        if (mezFacadesEnabled && mezFacades.length > 0) {
          reqs.push(
            api.put(
              `/products/${idProduct}/facades`,
              mezFacades.map((s) => ({
                ...s,
                mezzanineId: mezId,
                materialId: s.isLdsp ? null : s.materialId || null,
              })),
            ),
          );
        }
        if (mezDrawersEnabled && mezDrawers.length > 0) {
          reqs.push(
            api.put(
              `/products/${idProduct}/drawers`,
              mezDrawers.map((s) => ({ ...s, mezzanineId: mezId })),
            ),
          );
        }
      } else {
        reqs.push(
          api.delete(`/products/${idProduct}/mezzanine`).catch(() => {}),
        );
      }

      if (countertopEnabled && ctMatId) {
        reqs.push(
          api.put(`/products/${idProduct}/countertop`, {
            materialId: ctMatId,
            width: num(ctWidth),
            depth: num(ctDepth),
            apronEnabled: ctApron,
            apronMaterialId: ctApron ? ctApronMatId || null : null,
            apronWidth: num(ctApronW),
            apronHeight: num(ctApronH),
          }),
        );
      } else if (!countertopEnabled) {
        reqs.push(
          api.delete(`/products/${idProduct}/countertop`).catch(() => {}),
        );
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

  /* ── computed limits ── */
  const W = num(width);
  const H = num(height);
  const D = num(depth);
  const dimensionsReady = W > 0 && H > 0 && D > 0;
  const mezH = num(mezHeight);
  const mainH = mezzanineEnabled ? H - mezH : H;

  const limits = useMemo(() => {
    const maxSections = Math.max(1, Math.ceil(W / 300));
    const maxPartitions = Math.max(1, Math.ceil(W / 150) - 1);
    const tsc = sectionsQty || 1;
    const tpc = partitionsEnabled
      ? partitions.reduce((s, p) => s + p.qty, 0)
      : 0;
    const maxShelves = Math.max(1, (Math.ceil(mainH / 150) - 1) * (tsc + tpc));
    const maxFacades = Math.max(1, Math.ceil(W / 300));
    const mts = mezSectionsQty || 1;
    const mtp = mezPartitionsEnabled
      ? mezPartitions.reduce((s, p) => s + p.qty, 0)
      : 0;
    const mezMaxShelves = Math.max(
      1,
      (Math.ceil(mezH / 150) - 1) * (mts + mtp),
    );
    return {
      maxSections,
      maxPartitions,
      totalSectionsCount: tsc,
      totalPartitionsCount: tpc,
      maxShelves,
      maxFacades,
      mezTotalSections: mts,
      mezTotalPartitions: mtp,
      mezMaxShelves,
    };
  }, [
    W,
    mainH,
    mezH,
    sectionsQty,
    partitionsEnabled,
    partitions,
    mezSectionsQty,
    mezPartitionsEnabled,
    mezPartitions,
  ]);

  const hdfMaterials = useMemo(
    () => materials.filter((m) => m.materialType.name === "ХДФ"),
    [materials],
  );

  const bodyMaterials = useMemo(
    () =>
      materials.filter(
        (m) =>
          m.materialType.name !== "ХДФ" &&
          m.materialType.name !== "Кромка" &&
          (m.calcType === "SHEET" || m.calcType === "SQM"),
      ),
    [materials],
  );

  const facadeMaterials = useMemo(
    () =>
      materials.filter(
        (m) =>
          m.materialType.name !== "ХДФ" && m.materialType.name !== "Камень",
      ),
    [materials],
  );

  const facadeErrorKeys = useMemo(() => {
    const s = new Set<string>();
    errors.forEach((k) => {
      if (k.startsWith("facadeMaterial_")) s.add(`_${k.split("_")[1]}`);
    });
    return s;
  }, [errors]);

  const mezFacadeErrorKeys = useMemo(() => {
    const s = new Set<string>();
    errors.forEach((k) => {
      if (k.startsWith("mezFacadeMaterial_")) s.add(`_${k.split("_")[1]}`);
    });
    return s;
  }, [errors]);

  return {
    /* data */
    product,
    materials,
    loading,
    saving,
    t,

    /* dimensions */
    width,
    setWidth,
    height,
    setHeight,
    depth,
    setDepth,
    W,
    H,
    D,
    dimensionsReady,
    mainH,
    mezH,

    /* toggles + state */
    sectionsEnabled,
    setSectionsEnabled,
    sectionsQty,
    setSectionsQty,
    backWallEnabled,
    backWallMaterialId,
    partitionsEnabled,
    partitions,
    setPartitions,
    shelvesEnabled,
    shelves,
    setShelves,
    facadesEnabled,
    facades,
    falseFacadesEnabled,
    falseFacadeQty,
    falseFacadeMaterialId,
    drawersEnabled,
    drawers,
    setDrawers,
    mezzanineEnabled,
    setMezzanineEnabled,
    countertopEnabled,
    setCountertopEnabled,
    extrasEnabled,
    extras,
    setExtras,

    /* mezzanine */
    mezHeight,
    setMezHeight,
    mezSectionsEnabled,
    setMezSectionsEnabled,
    mezSectionsQty,
    setMezSectionsQty,
    mezPartitionsEnabled,
    mezPartitions,
    setMezPartitions,
    mezShelvesEnabled,
    mezShelves,
    setMezShelves,
    mezFacadesEnabled,
    mezFacades,
    mezDrawersEnabled,
    mezDrawers,
    setMezDrawers,
    mezBackWallEnabled,
    mezBackWallMaterialId,
    mezSameAsBody,
    setMezSameAsBody,
    mezBodyMaterialId,
    mezFalseFacadesEnabled,
    mezFalseFacadeQty,
    mezFalseFacadeMaterialId,

    /* countertop */
    ctMatId,
    ctWidth,
    setCtWidth,
    ctDepth,
    setCtDepth,
    ctApron,
    setCtApron,
    ctApronMatId,
    ctApronW,
    setCtApronW,
    ctApronH,
    setCtApronH,

    /* toggle callbacks */
    togglePartitions,
    toggleShelves,
    toggleDrawers,
    toggleBackWall,
    toggleFacades,
    toggleFalseFacades,
    toggleExtras,
    toggleMezPartitions,
    toggleMezShelves,
    toggleMezDrawers,
    toggleMezBackWall,
    toggleMezFacades,
    toggleMezFalseFacades,

    /* material change callbacks */
    onBackWallMaterialChange,
    onFalseFacadeMaterialChange,
    onMezBackWallMaterialChange,
    onMezBodyMaterialChange,
    onMezFalseFacadeMaterialChange,
    onCtMaterialChange,
    onApronMaterialChange,

    /* facade setters */
    setFacadesWithClear,
    setMezFacadesWithClear,
    onFalseFacadeQtyChange,
    onMezFalseFacadeQtyChange,

    /* validation & save */
    hasError,
    clearError,
    handleSave,

    /* computed */
    limits,
    hdfMaterials,
    bodyMaterials,
    facadeMaterials,
    facadeErrorKeys,
    mezFacadeErrorKeys,
  };
}
