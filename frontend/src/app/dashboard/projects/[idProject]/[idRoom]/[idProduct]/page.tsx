"use client";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { selectOnFocus } from "@/lib/utils";
import {
  ArrowLeft,
  DoorOpen,
  Layers,
  LayoutGrid,
  Package,
  PanelBottom,
  Ruler,
  Save,
  Settings2,
  SquareStack,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";

import {
  DimensionEditor,
  DrawersEditor,
  ExtrasEditor,
  FacadesEditor,
  MatSelect,
  QtySelect,
  SwitchRow,
  ToggleSection,
} from "./editors";
import { num } from "./types";
import { useProductForm } from "./use-product-form";

export default function ProductPage({
  params,
}: {
  params: Promise<{ idProject: string; idRoom: string; idProduct: string }>;
}) {
  const { idProject, idRoom, idProduct } = use(params);
  const router = useRouter();

  const f = useProductForm(idProject, idRoom, idProduct);
  const {
    product,
    loading,
    saving,
    t,
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
    onBackWallMaterialChange,
    onFalseFacadeMaterialChange,
    onMezBackWallMaterialChange,
    onMezBodyMaterialChange,
    onMezFalseFacadeMaterialChange,
    onCtMaterialChange,
    onApronMaterialChange,
    setFacadesWithClear,
    setMezFacadesWithClear,
    onFalseFacadeQtyChange,
    onMezFalseFacadeQtyChange,
    hasError,
    clearError,
    handleSave,
    limits,
    hdfMaterials,
    bodyMaterials,
    facadeMaterials,
    facadeErrorKeys,
    mezFacadeErrorKeys,
    materials,
  } = f;

  const {
    maxSections,
    maxPartitions,
    totalSectionsCount,
    totalPartitionsCount,
    maxShelves,
    maxFacades,
    mezTotalSections,
    mezTotalPartitions,
    mezMaxShelves,
  } = limits;

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-3 px-1 pb-24">
        <div className="flex items-center gap-3 py-3">
          <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
        </div>
        <Card className="gap-0 py-0">
          <div className="p-4 space-y-3">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3.5 w-14 rounded bg-muted animate-pulse" />
                  <div className="h-10 rounded-md bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </Card>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="gap-0 py-0">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="h-4 w-24 flex-1 rounded bg-muted animate-pulse" />
              <div className="h-5 w-9 rounded-full bg-muted animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!product) {
    return <EmptyState icon={Package} title={t("product.notFound")} />;
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
            onClick={() =>
              router.push(`/dashboard/projects/${idProject}/${idRoom}`)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              {product.productType.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">{product.room.project.name}</span>
              {product.room.roomType && (
                <>
                  <span>·</span>
                  <span className="truncate">{product.room.roomType.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Dimensions card ── */}
      <Card className="gap-0 py-0">
        <CardHeader className="px-4 pb-0 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Ruler className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-sm">{t("product.dimensions")}</CardTitle>
          </div>
          {dimensionsReady && (
            <CardDescription>
              <Badge variant="secondary" className="text-xs">
                {W} × {H} × {D} {t("common.mm")}
              </Badge>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                W ({t("common.mm")})
              </Label>
              <Input
                type="text" inputMode="decimal"
                className={`h-9 ${hasError("dimensions") && num(width) <= 0 ? "ring-2 ring-destructive/50 border-destructive" : ""}`}
                value={width}
                onFocus={selectOnFocus}
                onChange={(e) => {
                  setWidth(e.target.value);
                  clearError("dimensions");
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                H ({t("common.mm")})
              </Label>
              <Input
                type="text" inputMode="decimal"
                className={`h-9 ${hasError("dimensions") && num(height) <= 0 ? "ring-2 ring-destructive/50 border-destructive" : ""}`}
                value={height}
                onFocus={selectOnFocus}
                onChange={(e) => {
                  setHeight(e.target.value);
                  clearError("dimensions");
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                D ({t("common.mm")})
              </Label>
              <Input
                type="text" inputMode="decimal"
                className={`h-9 ${hasError("dimensions") && num(depth) <= 0 ? "ring-2 ring-destructive/50 border-destructive" : ""}`}
                value={depth}
                onFocus={selectOnFocus}
                onChange={(e) => {
                  setDepth(e.target.value);
                  clearError("dimensions");
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Toggle sections ── */}
      <div className="space-y-2">
        <ToggleSection
          icon={LayoutGrid}
          label={t("product.sections")}
          checked={sectionsEnabled}
          onChange={setSectionsEnabled}
          disabled={!dimensionsReady}
        >
          <QtySelect
            label={t("product.sectionCount")}
            value={sectionsQty}
            onChange={setSectionsQty}
            min={1}
            max={maxSections}
          />
        </ToggleSection>

        <ToggleSection
          icon={Layers}
          label={t("product.partitions")}
          checked={partitionsEnabled}
          onChange={togglePartitions}
          disabled={!dimensionsReady}
        >
          <DimensionEditor
            items={partitions}
            setItems={setPartitions}
            dimLabel={t("product.height")}
            dimKey="height"
            maxQty={maxPartitions}
            dimMin={150}
            dimMax={H}
            defaultDim={H}
            t={t}
          />
        </ToggleSection>

        <ToggleSection
          icon={SquareStack}
          label={t("product.shelves")}
          checked={shelvesEnabled}
          onChange={toggleShelves}
          disabled={!dimensionsReady}
        >
          <DimensionEditor
            items={shelves}
            setItems={setShelves}
            dimLabel={t("product.width")}
            dimKey="width"
            maxQty={maxShelves}
            dimMin={150}
            dimMax={W}
            defaultDim={Math.floor(
              W / (totalSectionsCount + totalPartitionsCount),
            )}
            t={t}
          />
        </ToggleSection>

        <ToggleSection
          icon={Package}
          label={t("product.drawers")}
          checked={drawersEnabled}
          onChange={toggleDrawers}
          disabled={!dimensionsReady}
        >
          <DrawersEditor
            items={drawers}
            setItems={setDrawers}
            prodH={mainH}
            prodW={W}
            totalSections={totalSectionsCount}
            totalPartitions={totalPartitionsCount}
            t={t}
          />
        </ToggleSection>

        <ToggleSection
          icon={PanelBottom}
          label={t("product.backWall")}
          checked={backWallEnabled}
          onChange={toggleBackWall}
          disabled={!dimensionsReady}
        >
          <MatSelect
            label={t("product.backWallMaterial")}
            value={backWallMaterialId}
            onChange={onBackWallMaterialChange}
            materials={hdfMaterials}
            t={t}
            error={hasError("backWallMaterial")}
          />
        </ToggleSection>

        <ToggleSection
          icon={DoorOpen}
          label={t("product.facades")}
          checked={facadesEnabled}
          onChange={toggleFacades}
          disabled={!dimensionsReady}
        >
          <FacadesEditor
            items={facades}
            setItems={setFacadesWithClear}
            materials={facadeMaterials}
            maxQty={maxFacades}
            maxW={W}
            maxH={H}
            defaultW={Math.floor(
              W / (totalSectionsCount + totalPartitionsCount),
            )}
            defaultH={H}
            t={t}
            errorKeys={facadeErrorKeys}
          />
        </ToggleSection>

        <ToggleSection
          icon={DoorOpen}
          label={t("product.falseFacades")}
          checked={falseFacadesEnabled}
          onChange={toggleFalseFacades}
          disabled={!dimensionsReady}
        >
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("product.qty")}
              </Label>
              <QtySelect
                value={num(falseFacadeQty)}
                onChange={onFalseFacadeQtyChange}
                min={1}
                max={10}
              />
            </div>
            <MatSelect
              label={t("product.falseFacadeMaterial")}
              value={falseFacadeMaterialId}
              onChange={onFalseFacadeMaterialChange}
              materials={facadeMaterials}
              t={t}
              error={hasError("falseFacadeMaterial")}
            />
          </div>
        </ToggleSection>

        {/* Антресоль */}
        <ToggleSection
          icon={Layers}
          label={t("product.antresol")}
          checked={mezzanineEnabled}
          onChange={setMezzanineEnabled}
          disabled={!dimensionsReady}
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("product.antresolHeight")}
              </Label>
              <Input
                type="text" inputMode="decimal"
                className="h-9"
                min={400}
                max={H}
                value={mezHeight}
                onFocus={selectOnFocus}
                onChange={(e) => setMezHeight(e.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">{t("product.mezSameAsBody")}</Label>
                <Switch
                  checked={mezSameAsBody}
                  onCheckedChange={(v) => {
                    setMezSameAsBody(v);
                    if (v) clearError("mezBodyMaterial");
                  }}
                />
              </div>
              {!mezSameAsBody && (
                <MatSelect
                  label={t("product.mezBodyMaterial")}
                  value={mezBodyMaterialId}
                  onChange={onMezBodyMaterialChange}
                  materials={bodyMaterials}
                  t={t}
                  error={hasError("mezBodyMaterial")}
                />
              )}
            </div>
            <Separator />
            <SwitchRow
              label={t("product.sections")}
              checked={mezSectionsEnabled}
              onChange={setMezSectionsEnabled}
            >
              <QtySelect
                label={t("product.sectionCount")}
                value={mezSectionsQty}
                onChange={setMezSectionsQty}
                min={1}
                max={maxSections}
              />
            </SwitchRow>
            <SwitchRow
              label={t("product.partitions")}
              checked={mezPartitionsEnabled}
              onChange={toggleMezPartitions}
            >
              <DimensionEditor
                items={mezPartitions}
                setItems={setMezPartitions}
                dimLabel={t("product.height")}
                dimKey="height"
                maxQty={maxPartitions}
                dimMin={150}
                dimMax={mezH}
                defaultDim={mezH}
                t={t}
              />
            </SwitchRow>
            <SwitchRow
              label={t("product.shelves")}
              checked={mezShelvesEnabled}
              onChange={toggleMezShelves}
            >
              <DimensionEditor
                items={mezShelves}
                setItems={setMezShelves}
                dimLabel={t("product.width")}
                dimKey="width"
                maxQty={mezMaxShelves}
                dimMin={150}
                dimMax={W}
                defaultDim={Math.floor(
                  W / (mezTotalSections + mezTotalPartitions),
                )}
                t={t}
              />
            </SwitchRow>
            <SwitchRow
              label={t("product.drawers")}
              checked={mezDrawersEnabled}
              onChange={toggleMezDrawers}
            >
              <DrawersEditor
                items={mezDrawers}
                setItems={setMezDrawers}
                prodH={mezH}
                prodW={W}
                totalSections={mezTotalSections}
                totalPartitions={mezTotalPartitions}
                t={t}
              />
            </SwitchRow>
            <SwitchRow
              label={t("product.backWall")}
              checked={mezBackWallEnabled}
              onChange={toggleMezBackWall}
            >
              <MatSelect
                label={t("product.backWallMaterial")}
                value={mezBackWallMaterialId}
                onChange={onMezBackWallMaterialChange}
                materials={hdfMaterials}
                t={t}
                error={hasError("mezBackWallMaterial")}
              />
            </SwitchRow>
            <SwitchRow
              label={t("product.facades")}
              checked={mezFacadesEnabled}
              onChange={toggleMezFacades}
            >
              <FacadesEditor
                items={mezFacades}
                setItems={setMezFacadesWithClear}
                materials={facadeMaterials}
                maxQty={maxFacades}
                maxW={W}
                maxH={mezH}
                defaultW={Math.floor(
                  W / (mezTotalSections + mezTotalPartitions),
                )}
                defaultH={mezH}
                t={t}
                errorKeys={mezFacadeErrorKeys}
              />
            </SwitchRow>
            <SwitchRow
              label={t("product.falseFacadesSwitch")}
              checked={mezFalseFacadesEnabled}
              onChange={toggleMezFalseFacades}
            >
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("product.qty")}
                  </Label>
                  <QtySelect
                    value={num(mezFalseFacadeQty)}
                    onChange={onMezFalseFacadeQtyChange}
                    min={1}
                    max={10}
                  />
                </div>
                <MatSelect
                  label={t("product.falseFacadeMaterial")}
                  value={mezFalseFacadeMaterialId}
                  onChange={onMezFalseFacadeMaterialChange}
                  materials={facadeMaterials}
                  t={t}
                  error={hasError("mezFalseFacadeMaterial")}
                />
              </div>
            </SwitchRow>
          </div>
        </ToggleSection>

        {/* Столешница */}
        <ToggleSection
          icon={PanelBottom}
          label={t("product.countertop")}
          checked={countertopEnabled}
          onChange={setCountertopEnabled}
          disabled={!dimensionsReady}
        >
          <div className="space-y-3">
            <MatSelect
              label={t("product.material")}
              value={ctMatId}
              onChange={onCtMaterialChange}
              materials={materials}
              t={t}
              error={hasError("countertopMaterial")}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.width")} ({t("common.mm")})
                </Label>
                <Input
                  type="text" inputMode="decimal"
                  className="h-9"
                  min={300}
                  max={W}
                  value={ctWidth}
                  onFocus={selectOnFocus}
                  onChange={(e) => setCtWidth(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.depthLabel")}
                </Label>
                <Input
                  type="text" inputMode="decimal"
                  className="h-9"
                  min={300}
                  max={900}
                  value={ctDepth}
                  onFocus={selectOnFocus}
                  onChange={(e) => setCtDepth(e.target.value)}
                />
              </div>
            </div>
            <Separator />
            <SwitchRow
              label={t("product.apron")}
              checked={ctApron}
              onChange={setCtApron}
            >
              <div className="space-y-2">
                <MatSelect
                  label={t("product.apronMaterial")}
                  value={ctApronMatId}
                  onChange={onApronMaterialChange}
                  materials={materials}
                  t={t}
                  error={hasError("apronMaterial")}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t("product.width")} ({t("common.mm")})
                    </Label>
                    <Input
                      type="text" inputMode="decimal"
                      className="h-9"
                      min={300}
                      max={num(ctWidth)}
                      value={ctApronW}
                      onFocus={selectOnFocus}
                      onChange={(e) => setCtApronW(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t("product.height")} ({t("common.mm")})
                    </Label>
                    <Input
                      type="text" inputMode="decimal"
                      className="h-9"
                      min={300}
                      max={900}
                      value={ctApronH}
                      onFocus={selectOnFocus}
                      onChange={(e) => setCtApronH(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </SwitchRow>
          </div>
        </ToggleSection>

        {/* Дополнительно */}
        <ToggleSection
          icon={Settings2}
          label={t("product.extra")}
          checked={extrasEnabled}
          onChange={toggleExtras}
          disabled={!dimensionsReady}
        >
          <ExtrasEditor items={extras} setItems={setExtras} t={t} />
        </ToggleSection>
      </div>

      {/* ── Fixed bottom bar ── */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:bottom-0 md:left-64">
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={saving || !dimensionsReady}
        >
          <Save className="mr-1.5 h-4 w-4" />
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
