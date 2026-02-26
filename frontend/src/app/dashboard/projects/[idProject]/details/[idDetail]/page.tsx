"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { NumInput } from "@/components/ui/num-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { shortenUrl } from "@/lib/shorten-url";
import {
  ArrowLeft,
  FileText,
  History,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/* ═══ Types ═══ */
interface DetailItem {
  id: string;
  type: "material" | "hardware" | "extra";
  label: string;
  materialId?: string;
  materialType?: string;
  hardwareType?: string;
  brand?: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  cost: number;
  enabled: boolean;
}

interface ProductResult {
  productId: string;
  productType: string;
  image?: string | null;
  dimensions: string;
  materialCost: number;
  hardwareCost: number;
  extrasCost: number;
  cleanPrice: number;
  bodySheets: number;
  totalSheets: number;
  edgeLm: number;
  bodyAreaMm2?: number;
  details: DetailItem[];
}

interface RoomResult {
  roomId: string;
  roomType: string;
  roomClean: number;
  products: ProductResult[];
}

interface MaterialOption {
  materialId: string;
  materialType: string;
  brand: string;
  price: number;
  calcType?: string;
  length?: number;
  width?: number;
}

interface HardwareOption {
  hardwareId: string;
  hardwareType: string;
  brand: string;
  price: number;
}

interface TierItem {
  materialId?: string;
  hardwareId?: string;
  brand: string;
  price: number;
  length?: number;
  width?: number;
  calcType?: string;
  tier: string;
}

interface TierPrices {
  materials: Record<string, TierItem[]>;
  hardware: Record<string, TierItem[]>;
}

interface Totals {
  productsSum: number;
  workshop: {
    saw: number;
    drill: number;
    edge: number;
    total: number;
    totalSheets: number;
    totalEdgeLm: number;
  };
  marketPrice: number;
  technologist: number;
  designer: number;
  assembly: number;
  delivery: number;
  discount: number;
  reserve?: number;
  cleanProfit: number;
  totalForClient: number;
  clean: number;
  shop: number;
  market: number;
}

interface CalcData {
  projectName: string;
  clientData: string | null;
  rooms: RoomResult[];
  materialOptions?: MaterialOption[];
  hardwareOptions?: HardwareOption[];
  tierPrices?: TierPrices;
  enabledTiers?: string[];
  tierRoomsSnapshot?: Record<string, RoomResult[]>;
  tierTotals?: Record<
    string,
    { totalForClient: number; cleanProfit: number; productsSum: number }
  >;
  totals: Totals;
  technologistPercent: number;
  designerPercent: number;
  assemblyPercent: number;
  deliveryPrice: number;
  sawingPrice: number;
  drillingPrice: number;
  edgeBandingPrice: number;
  profitType: string;
  profitValue: number;
  calculatedAt: string;
}

interface Calc {
  id: string;
  createdAt: string;
  data: CalcData;
}

type Tier = "standard" | "comfort" | "premium";

/* ═══ Helper: apply tier prices to rooms ═══ */
function applyTierPrices(
  baseRooms: RoomResult[],
  tierPrices: TierPrices,
  tier: Tier,
): RoomResult[] {
  /* Comfort = user-selected materials, already in baseRooms. No replacement needed. */
  if (tier === "comfort") {
    return JSON.parse(JSON.stringify(baseRooms));
  }

  const rooms: RoomResult[] = JSON.parse(JSON.stringify(baseRooms));
  for (const room of rooms) {
    for (const product of room.products) {
      for (const det of product.details) {
        if (det.type === "material" && det.materialType) {
          const tierItems = tierPrices.materials[det.materialType];
          const tierItem = tierItems?.find((t) => t.tier === tier);
          if (tierItem) {
            det.unitPrice = tierItem.price;
            det.brand = tierItem.brand;
            det.materialId = tierItem.materialId;
            if (
              det.id === "body" &&
              det.materialType === "ЛДСП" &&
              product.bodyAreaMm2
            ) {
              const sL = tierItem.length ?? 2800;
              const sW = tierItem.width ?? 2070;
              const sheetArea = (sL / 1000) * (sW / 1000);
              const bodyArea = product.bodyAreaMm2 / 1_000_000;
              const sheets =
                sheetArea > 0 ? Math.ceil(bodyArea / sheetArea) : 0;
              det.qty = sheets;
              det.cost = Math.round(sheets * tierItem.price);
            } else {
              det.cost = Math.round(det.qty * tierItem.price);
            }
          }
        } else if (det.type === "hardware" && det.hardwareType) {
          const tierItems = tierPrices.hardware[det.hardwareType];
          const tierItem = tierItems?.find((t) => t.tier === tier);
          if (tierItem) {
            det.unitPrice = tierItem.price;
            det.brand = tierItem.brand;
            det.cost = Math.round(det.qty * tierItem.price);
          }
        }
      }
    }
  }
  return rooms;
}

/* ═══ Helper: compute totals for a set of rooms ═══ */
function computeRoomTotals(
  rooms: RoomResult[],
  opts: {
    techPct: number;
    designPct: number;
    assemblyPct: number;
    sawPrice: number;
    drillPrice: number;
    edgePrice: number;
    delivPrice: number;
    discountPct: number;
    profitType: "COEF" | "FIXED";
    profitValue: number;
    reservePct: number;
  },
) {
  let productsSum = 0;
  let productsSumNoReserve = 0;
  let totalSheets = 0;
  let totalEdgeLm = 0;
  let totalProductCount = 0;
  let materialSumRaw = 0;
  let hardwareSumRaw = 0;
  const roomSums: number[] = [];

  for (const room of rooms) {
    let roomSum = 0;
    for (const pr of room.products) {
      let pSum = 0;
      for (const det of pr.details) {
        if (det.enabled) {
          const detCost = det.qty * det.unitPrice;
          pSum += detCost;
          if (det.type === "material") materialSumRaw += detCost;
          else if (det.type === "hardware") hardwareSumRaw += detCost;
        }
      }
      productsSumNoReserve += pSum;
      pSum = Math.round(pSum * (1 + opts.reservePct / 100));
      productsSum += pSum;
      totalSheets += pr.totalSheets;
      totalEdgeLm += pr.edgeLm;
      totalProductCount++;
      roomSum += pSum;
    }
    roomSums.push(roomSum);
  }

  const sawCost = totalSheets * opts.sawPrice;
  const drillCost = totalSheets * opts.drillPrice;
  const edgeCost = totalEdgeLm * opts.edgePrice;
  const workshopTotal = sawCost + drillCost + edgeCost;

  const marketPrice = (productsSumNoReserve + workshopTotal) * 2;
  const techCost = (marketPrice * opts.techPct) / 100;
  const designCost = (marketPrice * opts.designPct) / 100;
  const assemblyCost = (marketPrice * opts.assemblyPct) / 100;

  let deliveryCost = 0;
  if (totalProductCount > 0) {
    deliveryCost =
      opts.delivPrice +
      Math.max(0, totalProductCount - 1) * (opts.delivPrice / 3);
  }

  let totalForClient: number;
  let cleanProfit: number;

  const reserveAmount = productsSum - productsSumNoReserve;

  if (opts.profitType === "COEF") {
    const base =
      (productsSumNoReserve + workshopTotal) * opts.profitValue + reserveAmount;
    const disc = (base * opts.discountPct) / 100;
    totalForClient = base - disc + deliveryCost;
    cleanProfit =
      totalForClient -
      productsSum -
      workshopTotal -
      techCost -
      designCost -
      assemblyCost -
      deliveryCost;
  } else {
    const base = productsSum + workshopTotal;
    const allCosts =
      base +
      opts.profitValue +
      techCost +
      designCost +
      assemblyCost +
      deliveryCost;
    const disc = (allCosts * opts.discountPct) / 100;
    totalForClient = allCosts - disc;
    cleanProfit =
      totalForClient -
      productsSum -
      workshopTotal -
      techCost -
      designCost -
      assemblyCost -
      deliveryCost;
  }

  const materialSum = Math.round(materialSumRaw * (1 + opts.reservePct / 100));
  const hardwareSum = Math.round(hardwareSumRaw * (1 + opts.reservePct / 100));

  return {
    productsSum: Math.round(productsSum),
    materialSum,
    hardwareSum,
    workshopTotal: Math.round(workshopTotal),
    sawCost: Math.round(sawCost),
    drillCost: Math.round(drillCost),
    edgeCost: Math.round(edgeCost),
    totalSheets,
    totalEdgeLm: Math.round(totalEdgeLm * 100) / 100,
    marketPrice: Math.round(marketPrice),
    techCost: Math.round(techCost),
    designCost: Math.round(designCost),
    assemblyCost: Math.round(assemblyCost),
    deliveryCost: Math.round(deliveryCost),
    totalProductCount,
    cleanProfit: Math.round(cleanProfit),
    totalForClient: Math.round(totalForClient),
    roomSums,
  };
}

/* ═══ Component ═══ */
export default function DetailPage({
  params,
}: {
  params: Promise<{ idProject: string; idDetail: string }>;
}) {
  const { idProject, idDetail } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const [calc, setCalc] = useState<Calc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProductKey, setUploadingProductKey] = useState<string | null>(
    null,
  );

  /* Active tier */
  const [activeTier, setActiveTier] = useState<Tier>("comfort");

  /* Tier-specific room data */
  const [tierRooms, setTierRooms] = useState<Record<Tier, RoomResult[]>>({
    standard: [],
    comfort: [],
    premium: [],
  });

  /* Enabled tiers for KP */
  const [enabledTiers, setEnabledTiers] = useState<Tier[]>([
    "standard",
    "comfort",
    "premium",
  ]);

  /* Shared editable state */
  const [techPct, setTechPct] = useState(0);
  const [designPct, setDesignPct] = useState(0);
  const [assemblyPct, setAssemblyPct] = useState(0);
  const [sawPrice, setSawPrice] = useState(0);
  const [drillPrice, setDrillPrice] = useState(0);
  const [edgePrice, setEdgePrice] = useState(0);
  const [delivPrice, setDelivPrice] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);
  const [profitType, setProfitType] = useState<"COEF" | "FIXED">("COEF");
  const [profitValue, setProfitValue] = useState(1);
  const [reservePct, setReservePct] = useState(10);

  const rooms = tierRooms[activeTier];

  const fetchCalc = useCallback(async () => {
    try {
      const { data } = await api.get(`/calculations/${idDetail}`);
      setCalc(data);
      const d: CalcData = data.data;

      setTechPct(d.technologistPercent);
      setDesignPct(d.designerPercent);
      setAssemblyPct(d.assemblyPercent);
      setSawPrice(d.sawingPrice);
      setDrillPrice(d.drillingPrice);
      setEdgePrice(d.edgeBandingPrice);
      setDelivPrice(d.deliveryPrice);
      setDiscountPct(d.totals.discount ?? 0);
      setReservePct(d.totals.reserve ?? 10);
      setProfitType((d.profitType as "COEF" | "FIXED") ?? "COEF");
      setProfitValue(d.profitValue ?? 1);

      if (d.enabledTiers) {
        setEnabledTiers(d.enabledTiers as Tier[]);
      }

      /* Initialize tier rooms */
      if (d.tierRoomsSnapshot) {
        // Restore saved tier rooms
        setTierRooms({
          standard: JSON.parse(
            JSON.stringify(d.tierRoomsSnapshot.standard ?? d.rooms),
          ),
          comfort: JSON.parse(
            JSON.stringify(d.tierRoomsSnapshot.comfort ?? d.rooms),
          ),
          premium: JSON.parse(
            JSON.stringify(d.tierRoomsSnapshot.premium ?? d.rooms),
          ),
        });
      } else {
        const baseRooms: RoomResult[] = JSON.parse(JSON.stringify(d.rooms));
        if (d.tierPrices) {
          setTierRooms({
            standard: applyTierPrices(baseRooms, d.tierPrices, "standard"),
            comfort: applyTierPrices(baseRooms, d.tierPrices, "comfort"),
            premium: applyTierPrices(baseRooms, d.tierPrices, "premium"),
          });
        } else {
          setTierRooms({
            standard: JSON.parse(JSON.stringify(baseRooms)),
            comfort: JSON.parse(JSON.stringify(baseRooms)),
            premium: JSON.parse(JSON.stringify(baseRooms)),
          });
        }
      }
    } catch {
      toast.error(t("detail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [idDetail, t]);

  useEffect(() => {
    fetchCalc();
  }, [fetchCalc]);

  /* ═══ Client-side recalculation for active tier ═══ */
  const computeOpts = useMemo(
    () => ({
      techPct,
      designPct,
      assemblyPct,
      sawPrice,
      drillPrice,
      edgePrice,
      delivPrice,
      discountPct,
      profitType,
      profitValue,
      reservePct,
    }),
    [
      techPct,
      designPct,
      assemblyPct,
      sawPrice,
      drillPrice,
      edgePrice,
      delivPrice,
      discountPct,
      profitType,
      profitValue,
      reservePct,
    ],
  );

  const computed = useMemo(
    () => computeRoomTotals(rooms, computeOpts),
    [rooms, computeOpts],
  );

  /* ═══ Handlers ═══ */
  const toggleDetail = (ri: number, pi: number, di: number) => {
    setTierRooms((prev) => {
      const next = { ...prev };
      const tierData: RoomResult[] = JSON.parse(
        JSON.stringify(next[activeTier]),
      );
      tierData[ri].products[pi].details[di].enabled =
        !tierData[ri].products[pi].details[di].enabled;
      next[activeTier] = tierData;
      return next;
    });
  };

  const updateDetailQty = (ri: number, pi: number, di: number, qty: number) => {
    setTierRooms((prev) => {
      const next = { ...prev };
      const tierData: RoomResult[] = JSON.parse(
        JSON.stringify(next[activeTier]),
      );
      const item = tierData[ri].products[pi].details[di];
      item.qty = qty;
      item.cost = Math.round(qty * item.unitPrice);
      next[activeTier] = tierData;
      return next;
    });
  };

  const updateDetailBrand = (
    ri: number,
    pi: number,
    di: number,
    option: MaterialOption | HardwareOption,
  ) => {
    setTierRooms((prev) => {
      const next = { ...prev };
      const tierData: RoomResult[] = JSON.parse(
        JSON.stringify(next[activeTier]),
      );
      const item = tierData[ri].products[pi].details[di];
      item.brand = option.brand;
      item.unitPrice = option.price;
      if ("materialId" in option) {
        item.materialId = option.materialId;
        if (
          item.id === "body" &&
          item.materialType === "ЛДСП" &&
          "length" in option &&
          "width" in option
        ) {
          const bodyArea = tierData[ri].products[pi].bodyAreaMm2;
          if (bodyArea) {
            const sL = (option as MaterialOption).length ?? 2800;
            const sW = (option as MaterialOption).width ?? 2070;
            const sheetArea = (sL / 1000) * (sW / 1000);
            const sheets =
              sheetArea > 0 ? Math.ceil(bodyArea / 1_000_000 / sheetArea) : 0;
            item.qty = sheets;
          }
        }
      }
      item.cost = Math.round(item.qty * item.unitPrice);
      next[activeTier] = tierData;
      return next;
    });
  };

  const toggleEnabledTier = (tier: Tier) => {
    setEnabledTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier],
    );
  };

  const setProductImageInAllTiers = useCallback(
    (ri: number, pi: number, image: string | null) => {
      setTierRooms((prev) => {
        const next = { ...prev };
        (["standard", "comfort", "premium"] as Tier[]).forEach((tier) => {
          next[tier] = prev[tier].map((room, roomIndex) => {
            if (roomIndex !== ri) return room;
            return {
              ...room,
              products: room.products.map((product, productIndex) =>
                productIndex === pi ? { ...product, image } : product,
              ),
            };
          });
        });
        return next;
      });
    },
    [],
  );

  const handleProductImageUpload = useCallback(
    async (ri: number, pi: number, file: File | null) => {
      if (!file) return;
      const key = `${ri}-${pi}`;
      setUploadingProductKey(key);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post("/uploads", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setProductImageInAllTiers(ri, pi, res.data.url as string);
        toast.success(t("detail.productImageUploaded"));
      } catch {
        toast.error(t("common.error"));
      } finally {
        setUploadingProductKey(null);
      }
    },
    [setProductImageInAllTiers, t],
  );

  const handleRemoveProductImage = useCallback(
    (ri: number, pi: number) => {
      setProductImageInAllTiers(ri, pi, null);
      toast.success(t("detail.productImageRemoved"));
    },
    [setProductImageInAllTiers, t],
  );

  const handleSave = async () => {
    if (!calc) return;
    setSaving(true);
    try {
      const d = calc.data;

      /* Compute tierTotals for all 3 tiers */
      const tierTotals: Record<
        string,
        { totalForClient: number; cleanProfit: number; productsSum: number }
      > = {};
      for (const tier of ["standard", "comfort", "premium"] as const) {
        const tc = computeRoomTotals(tierRooms[tier], computeOpts);
        tierTotals[tier] = {
          totalForClient: tc.totalForClient,
          cleanProfit: tc.cleanProfit,
          productsSum: tc.productsSum,
        };
      }

      const updatedData: CalcData = {
        ...d,
        rooms: tierRooms.comfort,
        tierRoomsSnapshot: tierRooms,
        enabledTiers,
        technologistPercent: techPct,
        designerPercent: designPct,
        assemblyPercent: assemblyPct,
        sawingPrice: sawPrice,
        drillingPrice: drillPrice,
        edgeBandingPrice: edgePrice,
        deliveryPrice: delivPrice,
        profitType,
        profitValue,
        tierTotals,
        totals: {
          ...d.totals,
          productsSum: computed.productsSum,
          workshop: {
            saw: computed.sawCost,
            drill: computed.drillCost,
            edge: computed.edgeCost,
            total: computed.workshopTotal,
            totalSheets: computed.totalSheets,
            totalEdgeLm: computed.totalEdgeLm,
          },
          marketPrice: computed.marketPrice,
          technologist: computed.techCost,
          designer: computed.designCost,
          assembly: computed.assemblyCost,
          delivery: computed.deliveryCost,
          discount: discountPct,
          reserve: reservePct,
          cleanProfit: computed.cleanProfit,
          totalForClient: computed.totalForClient,
          clean: computed.productsSum,
          shop: computed.productsSum + computed.workshopTotal,
          market: computed.totalForClient,
        },
      };

      await api.patch(`/calculations/${calc.id}`, { data: updatedData });
      toast.success(t("detail.saved"));
    } catch {
      toast.error(t("detail.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateKP = async () => {
    await handleSave();
    const publicUrl = `${window.location.origin}/proposal/${idDetail}`;
    const shortUrl = await shortenUrl(publicUrl);
    try {
      await navigator.clipboard.writeText(shortUrl);
      toast.success(t("detail.linkCopied"));
    } catch {
      toast.info(t("common.linkFallback", { url: shortUrl }));
    }
    router.push(
      `/dashboard/projects/${idProject}/details/${idDetail}/proposal`,
    );
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === "kz" ? "kk-KZ" : "ru-RU").format(n) + " ₸";
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === "kz" ? "kk-KZ" : "ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="sticky top-12 md:top-0 z-20 -mx-1 border-b bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-5 w-28 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <div className="h-4 w-36 rounded bg-muted animate-pulse" />
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!calc) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {t("detail.notFound")}
      </p>
    );
  }

  const d = calc.data;
  const materialOptions = d.materialOptions ?? [];
  const hardwareOptions = d.hardwareOptions ?? [];

  return (
    <div className="space-y-6 pb-24">
      {/* header + tabs */}
      <div className="sticky top-12 md:top-0 z-20 border-b bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={t("common.back")}
            onClick={() => router.push(`/dashboard/projects/${idProject}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {t("detail.prefix")} {d.projectName}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {fmtDate(d.calculatedAt)}
              {d.clientData && ` · ${d.clientData}`}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ TIER TABS ═══ */}
      <Tabs value={activeTier} onValueChange={(v) => setActiveTier(v as Tier)}>
        <div className="sticky top-[108px] md:top-[68px] z-10 -mx-1 bg-background px-1 pb-2 ">
          <TabsList className="w-full justify-start shadow-sm">
            <TabsTrigger
              value="standard"
              className="data-[state=inactive]:text-muted-foreground"
            >
              {t("detail.tiers.standard")}
            </TabsTrigger>
            <TabsTrigger
              value="comfort"
              className="data-[state=inactive]:text-muted-foreground"
            >
              {t("detail.tiers.comfort")}
            </TabsTrigger>
            <TabsTrigger
              value="premium"
              className="data-[state=inactive]:text-muted-foreground"
            >
              {t("detail.tiers.premium")}
            </TabsTrigger>
          </TabsList>
        </div>

        {(["standard", "comfort", "premium"] as Tier[]).map((tier) => (
          <TabsContent key={tier} value={tier} className="pt-2">
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* ── Left column: rooms ── */}
              <div className="space-y-6">
                {/* rooms */}
                <Accordion
                  type="multiple"
                  defaultValue={rooms.map((_, i) => `room-${i}`)}
                >
                  {rooms.map((room, ri) => (
                    <AccordionItem key={ri} value={`room-${ri}`}>
                      <AccordionTrigger className="text-base">
                        <div className="flex items-center gap-2">
                          {room.roomType}
                          <Badge variant="secondary" className="text-xs">
                            {room.products.length} {t("detail.productsShort")}
                          </Badge>
                          <span className="ml-auto text-sm text-muted-foreground">
                            {fmt(computed.roomSums[ri] ?? 0)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        {room.products.map((pr, pi) => {
                          const pRaw = pr.details
                            .filter((det) => det.enabled)
                            .reduce((s, det) => s + det.qty * det.unitPrice, 0);
                          const pSum = Math.round(
                            pRaw * (1 + reservePct / 100),
                          );
                          return (
                            <Card key={pi}>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between gap-3 text-sm">
                                  <span className="min-w-0 break-words">
                                    {pr.productType}
                                  </span>
                                  <span className="shrink-0 font-semibold whitespace-nowrap">
                                    {fmt(pSum)}
                                  </span>
                                </CardTitle>
                                <div className="mt-2 rounded-lg border bg-muted/20 p-2.5">
                                  <div className="mb-2 text-[11px] text-muted-foreground">
                                    {t("detail.productImageHint")}
                                  </div>
                                  <div className="flex flex-col gap-2.5">
                                    <div className="h-36 w-full overflow-hidden rounded-md border bg-background">
                                      {pr.image ? (
                                        <img
                                          src={pr.image}
                                          alt={pr.productType}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                          <ImagePlus className="h-4 w-4" />
                                        </div>
                                      )}
                                    </div>
                                    <input
                                      id={`product-image-${tier}-${ri}-${pi}`}
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp,image/gif"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file =
                                          e.target.files?.[0] ?? null;
                                        void handleProductImageUpload(
                                          ri,
                                          pi,
                                          file,
                                        );
                                        e.currentTarget.value = "";
                                      }}
                                    />
                                    <div className="flex w-full items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                        asChild
                                        disabled={
                                          uploadingProductKey === `${ri}-${pi}`
                                        }
                                      >
                                        <label
                                          htmlFor={`product-image-${tier}-${ri}-${pi}`}
                                          className="inline-flex w-full cursor-pointer items-center justify-center"
                                        >
                                          {uploadingProductKey ===
                                          `${ri}-${pi}` ? (
                                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <ImagePlus className="mr-1 h-3.5 w-3.5" />
                                          )}
                                          {pr.image
                                            ? t("detail.changeProductImage")
                                            : t("detail.uploadProductImage")}
                                        </label>
                                      </Button>

                                      {pr.image ? (
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="shrink-0 text-destructive hover:text-destructive"
                                          onClick={() =>
                                            handleRemoveProductImage(ri, pi)
                                          }
                                          aria-label={t("common.delete")}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-1 px-3 pb-3">
                                {pr.details.map((det, di) => {
                                  const displayCost = det.qty * det.unitPrice;

                                  /* Brand options for this item */
                                  const brandOpts =
                                    det.type === "material" && det.materialType
                                      ? materialOptions.filter(
                                          (m) =>
                                            m.materialType === det.materialType,
                                        )
                                      : det.type === "hardware" &&
                                          det.hardwareType
                                        ? hardwareOptions.filter(
                                            (h) =>
                                              h.hardwareType ===
                                              det.hardwareType,
                                          )
                                        : [];

                                  return (
                                    <div
                                      key={di}
                                      className={`flex items-start gap-2 rounded-lg px-2 py-2 ${
                                        det.enabled
                                          ? "hover:bg-muted/40"
                                          : "opacity-40"
                                      }`}
                                    >
                                      <Checkbox
                                        className="mt-0.5 shrink-0"
                                        checked={det.enabled}
                                        onCheckedChange={() =>
                                          toggleDetail(ri, pi, di)
                                        }
                                      />
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                          <span
                                            className={`max-w-[140px] text-xs font-medium leading-tight ${!det.enabled ? "line-through" : ""}`}
                                          >
                                            {det.label}
                                          </span>
                                          <span className="shrink-0 text-xs font-medium tabular-nums">
                                            {det.enabled
                                              ? fmt(displayCost)
                                              : ""}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {brandOpts.length > 1 ? (
                                            <SearchableSelect
                                              value={
                                                det.type === "material"
                                                  ? (det.materialId ?? "")
                                                  : (det.brand ?? "")
                                              }
                                              onChange={(v) => {
                                                if (det.type === "material") {
                                                  const opt =
                                                    materialOptions.find(
                                                      (m) => m.materialId === v,
                                                    );
                                                  if (opt)
                                                    updateDetailBrand(
                                                      ri,
                                                      pi,
                                                      di,
                                                      opt,
                                                    );
                                                } else {
                                                  const opt =
                                                    hardwareOptions.find(
                                                      (h) => h.brand === v,
                                                    );
                                                  if (opt)
                                                    updateDetailBrand(
                                                      ri,
                                                      pi,
                                                      di,
                                                      opt,
                                                    );
                                                }
                                              }}
                                              disabled={!det.enabled}
                                              options={brandOpts.map(
                                                (opt, oi) => ({
                                                  value:
                                                    "materialId" in opt
                                                      ? (opt as MaterialOption)
                                                          .materialId
                                                      : opt.brand || String(oi),
                                                  label: `${opt.brand || "—"} · ${fmt(opt.price)}`,
                                                }),
                                              )}
                                              placeholder={t("common.brand")}
                                              searchPlaceholder={
                                                t("common.search") + "…"
                                              }
                                              emptyText={t("common.noResults")}
                                              className="w-[140px] text-[11px] px-2 h-8"
                                            />
                                          ) : (
                                            <span
                                              className="inline-flex w-[140px] items-center text-[11px] text-muted-foreground"
                                              style={{ height: 32 }}
                                            >
                                              {det.brand
                                                ? `${det.brand} · ${fmt(det.unitPrice)}`
                                                : "—"}
                                            </span>
                                          )}
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] text-muted-foreground">
                                              ×
                                            </span>
                                            <div className="relative">
                                              <NumInput
                                                className="w-[70px] px-1 py-0 text-[11px] text-center pr-5"
                                                style={{
                                                  height: 32,
                                                  minHeight: 32,
                                                }}
                                                min={0}
                                                value={det.qty}
                                                onValueChange={(v) =>
                                                  updateDetailQty(ri, pi, di, v)
                                                }
                                                disabled={!det.enabled}
                                              />
                                              {det.unit && (
                                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground pointer-events-none">
                                                  {det.unit}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* ── Right column: summary + services ── */}
              <div className="space-y-6 lg:sticky lg:top-[120px] lg:self-start">
                {/* ═══ Material & Hardware Summary ═══ */}
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {t("detail.materialCost")}
                        </span>
                        <span className="text-base font-semibold tabular-nums">
                          {fmt(computed.materialSum)}
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {t("detail.hardwareCost")}
                        </span>
                        <span className="text-base font-semibold tabular-nums">
                          {fmt(computed.hardwareSum)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ═══ Services & Pricing ═══ */}
                <Card>
                  <CardContent className="space-y-5">
                    {/* Services */}
                    <div className="space-y-2">
                      {/* Reserve */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="text-sm text-muted-foreground sm:w-24 sm:shrink-0">
                          {t("detail.reserve")}
                        </span>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="relative w-1/2 sm:w-24">
                            <NumInput
                              className="h-9 w-full pr-6 text-sm text-right"
                              min={0}
                              max={100}
                              value={reservePct}
                              onValueChange={setReservePct}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              %
                            </span>
                          </div>
                          <span className="w-1/2 sm:w-24" />
                        </div>
                      </div>

                      <Separator className="my-3" />

                      {[
                        {
                          label: t("detail.technologist"),
                          value: techPct,
                          set: setTechPct,
                          result: computed.techCost,
                          suffix: "%",
                        },
                        {
                          label: t("detail.designer"),
                          value: designPct,
                          set: setDesignPct,
                          result: computed.designCost,
                          suffix: "%",
                        },
                      ].map((row, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
                        >
                          <span className="text-sm text-muted-foreground sm:w-24 sm:shrink-0">
                            {row.label}
                          </span>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-1/2 sm:w-24">
                              <NumInput
                                className="h-9 w-full pr-6 text-sm text-right"
                                min={0}
                                value={row.value}
                                onValueChange={row.set}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {row.suffix}
                              </span>
                            </div>
                            <span className="w-1/2 sm:w-24 text-right text-sm font-medium tabular-nums">
                              {fmt(row.result)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-3" />

                    {/* Workshop */}
                    <div className="space-y-2">
                      {[
                        {
                          label: t("detail.sawing"),
                          value: sawPrice,
                          set: setSawPrice,
                          result: computed.sawCost,
                          suffix: "₸",
                          info: `${computed.totalSheets} ${t("detail.sheets")}`,
                        },
                        {
                          label: t("detail.drilling"),
                          value: drillPrice,
                          set: setDrillPrice,
                          result: computed.drillCost,
                          suffix: "₸",
                          info: `${computed.totalSheets} ${t("detail.sheets")}`,
                        },
                        {
                          label: t("detail.edgeBanding"),
                          value: edgePrice,
                          set: setEdgePrice,
                          result: computed.edgeCost,
                          suffix: "₸",
                          info: `${computed.totalEdgeLm} ${t("detail.edgeMeters")}`,
                        },
                      ].map((row, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
                        >
                          <div className="sm:w-24 sm:shrink-0">
                            <span className="text-sm text-muted-foreground">
                              {row.label}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground/70">
                              {row.info}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-1/2 sm:w-24">
                              <NumInput
                                className="h-9 w-full pr-6 text-sm text-right"
                                min={0}
                                value={row.value}
                                onValueChange={row.set}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {row.suffix}
                              </span>
                            </div>
                            <span className="w-1/2 sm:w-24 text-right text-sm font-medium tabular-nums">
                              {fmt(row.result)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-3" />

                    {/* Delivery & Assembly */}
                    <div className="space-y-2">
                      {[
                        {
                          label: t("detail.delivery"),
                          value: delivPrice,
                          set: setDelivPrice,
                          result: computed.deliveryCost,
                          suffix: "₸",
                          info: `${computed.totalProductCount} ${t("detail.productsCount")}`,
                        },
                        {
                          label: t("detail.assembly"),
                          value: assemblyPct,
                          set: setAssemblyPct,
                          result: computed.assemblyCost,
                          suffix: "%",
                          info: undefined as string | undefined,
                        },
                      ].map((row, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
                        >
                          <div className="sm:w-24 sm:shrink-0">
                            <span className="text-sm text-muted-foreground">
                              {row.label}
                            </span>
                            {row.info && (
                              <span className="ml-2 text-xs text-muted-foreground/70">
                                {row.info}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-1/2 sm:w-24">
                              <NumInput
                                className="h-9 w-full pr-6 text-sm text-right"
                                min={0}
                                value={row.value}
                                onValueChange={row.set}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {row.suffix}
                              </span>
                            </div>
                            <span className="w-1/2 sm:w-24 text-right text-sm font-medium tabular-nums">
                              {fmt(row.result)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-3" />

                    {/* Discount */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-sm text-muted-foreground sm:w-24 sm:shrink-0">
                        {t("detail.discount")}
                      </span>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-1/2 sm:w-24">
                          <NumInput
                            className="h-9 w-full pr-6 text-sm text-right"
                            min={0}
                            max={100}
                            value={discountPct}
                            onValueChange={setDiscountPct}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            %
                          </span>
                        </div>
                        <span className="w-1/2 sm:w-24" />
                      </div>
                    </div>

                    {/* Profit */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-sm text-muted-foreground sm:w-24 sm:shrink-0">
                        {t("detail.profitParams")}
                      </span>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select
                          value={profitType}
                          onValueChange={(v) =>
                            setProfitType(v as "COEF" | "FIXED")
                          }
                        >
                          <SelectTrigger className="h-9 w-1/2 sm:w-24 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COEF">
                              {t("detail.coefficient")}
                            </SelectItem>
                            <SelectItem value="FIXED">
                              {t("detail.fixedAmount")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <NumInput
                          className="h-9 w-1/2 sm:w-24 pr-2 text-sm text-right"
                          min={0}
                          value={profitValue}
                          onValueChange={setProfitValue}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* ═══ TIER SWITCHES FOR KP ═══ */}
      <div className="rounded-md border p-4 space-y-3">
        <h2 className="text-sm font-medium">{t("detail.tierTitle")}</h2>
        <div className="grid grid-cols-3 gap-2">
          {(["standard", "comfort", "premium"] as Tier[]).map((tier) => (
            <label
              key={tier}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <Switch
                checked={enabledTiers.includes(tier)}
                onCheckedChange={() => toggleEnabledTier(tier)}
              />
              {t(`detail.tiers.${tier}`)}
            </label>
          ))}
        </div>
      </div>

      {/* ── Fixed bottom bar ── */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-background px-5 py-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:bottom-0 md:left-64">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          {/* Totals */}
          <div className="grid grid-cols-2 gap-px lg:flex lg:gap-8">
            <div className="flex flex-col border-r lg:border-r-0">
              <span className="text-[8px] uppercase tracking-wider text-center lg:text-left text-muted-foreground/70">
                {t("detail.totalClientLabel")}
              </span>
              <strong className="text-primary tabular-nums text-lg text-center lg:text-left font-bold leading-tight">
                {fmt(computed.totalForClient)}
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-wider text-center lg:text-left text-green-500">
                {t("detail.cleanProfitLabel")}
              </span>
              <strong className="text-green-600 tabular-nums text-lg text-center lg:text-left font-bold leading-tight">
                {fmt(computed.cleanProfit)}
              </strong>
            </div>
          </div>
          {/* Buttons */}
          <div className="grid grid-cols-2 gap-2 lg:flex lg:gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/projects/${idProject}/details`)
              }
            >
              <History className="mr-1.5 h-4 w-4" />
              {t("detail.history")}
            </Button>
            <Button onClick={handleCreateKP} disabled={saving}>
              <FileText className="mr-1.5 h-4 w-4" />
              {saving ? t("detail.saving") : t("detail.createKp")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
