"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Archive,
  ArrowLeft,
  Box,
  Columns3,
  DoorOpen,
  Loader2,
  PackagePlus,
  PanelTop,
  Rows3,
  Save,
  UtensilsCrossed,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  ComponentEditor,
  CountertopsEditor,
  DrawersEditor,
  ExtrasEditor,
  FacadesEditor,
  FalseFacadesEditor,
  SectionsEditor,
  ToggleSection,
} from "./editors";
import { useCollapseState } from "./use-collapse-state";
import { useProductForm } from "./use-product-form";

export default function ProductPage() {
  const { idProject, idRoom, idProduct } = useParams<{
    idProject: string;
    idRoom: string;
    idProduct: string;
  }>();
  const router = useRouter();

  const f = useProductForm(idProject, idRoom, idProduct);
  const cs = useCollapseState(idProduct);
  const [backOpen, setBackOpen] = useState(false);

  const backUrl = `/dashboard/projects/${idProject}/${idRoom}`;

  const handleBack = useCallback(() => {
    setBackOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    setBackOpen(false);
    router.push(backUrl);
  }, [router, backUrl]);

  const handleSaveAndLeave = useCallback(async () => {
    setBackOpen(false);
    await f.handleSave();
  }, [f]);

  if (f.loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!f.product) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center text-muted-foreground">
        {f.t("product.notFound")}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-20">
      {/* ── Sticky header ── */}
      <div className="sticky top-12 md:top-0 z-20 border-b bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 py-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Back"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              {f.product.productType.name}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {f.t("product.editDescription")}
            </p>
          </div>
        </div>
      </div>

      {/* ── toggle sections ── */}
      <div className="columns-1 gap-3 lg:columns-2 [&>*]:mb-3">
        {/* Sections */}
        <ToggleSection
          icon={Box}
          label={f.t("product.sections")}
          checked={f.sectionsEnabled}
          onChange={f.toggleSections}
        >
          <SectionsEditor
            items={f.sections}
            setItems={f.setSections}
            materials={f.bodyMaterials}
            backWallMaterials={f.backWallMaterials}
            legsHardware={f.legsHardware}
            t={f.t}
            defaultItem={{
              width: f.defaultWidth,
              height: f.defaultHeight,
              depth: f.defaultDepth,
              materialId: f.defaultMaterialId,
            }}
            errors={f.sectionErrors}
            cs={cs}
          />
        </ToggleSection>

        {/* Partitions */}
        <ToggleSection
          icon={Columns3}
          label={f.t("product.partitions")}
          checked={f.partitionsEnabled}
          onChange={f.togglePartitions}
        >
          <ComponentEditor
            items={f.partitions}
            setItems={f.setPartitions}
            dim1Key="height"
            dim1Label={f.t("product.height")}
            dim2Key="depth"
            dim2Label={f.t("product.depth")}
            materials={f.bodyMaterials}
            t={f.t}
            defaultItem={{
              dim1: f.defaultHeight,
              dim2: f.defaultDepth,
              materialId: f.defaultMaterialId,
            }}
            errors={f.partitionErrors}
            defaultLabel={f.t("product.partitions")}
            cs={cs}
            collapsePrefix="par"
          />
        </ToggleSection>

        {/* Shelves */}
        <ToggleSection
          icon={Rows3}
          label={f.t("product.shelves")}
          checked={f.shelvesEnabled}
          onChange={f.toggleShelves}
        >
          <ComponentEditor
            items={f.shelves}
            setItems={f.setShelves}
            dim1Key="width"
            dim1Label={f.t("product.width")}
            dim2Key="depth"
            dim2Label={f.t("product.depth")}
            materials={f.bodyMaterials}
            t={f.t}
            hardwareLabel={f.t("product.shelfHolders")}
            hardwareItems={f.holderHardware}
            hardwareField="holderHardwareId"
            defaultItem={{
              dim1: f.defaultWidth,
              dim2: f.defaultDepth,
              materialId: f.defaultMaterialId,
            }}
            errors={f.shelfErrors}
            defaultLabel={f.t("product.shelves")}
            cs={cs}
            collapsePrefix="shf"
          />
        </ToggleSection>

        {/* Facades */}
        <ToggleSection
          icon={DoorOpen}
          label={f.t("product.facades")}
          checked={f.facadesEnabled}
          onChange={f.toggleFacades}
        >
          <FacadesEditor
            items={f.facades}
            setItems={f.setFacadesWithClear}
            materials={f.facadeMaterials}
            t={f.t}
            errorKeys={f.facadeErrorKeys}
            hingeHardware={f.hingeHardware}
            handleHardware={f.handleHardware}
            tipOnHardware={f.tipOnHardware}
            defaultWidth={f.defaultWidth}
            defaultHeight={f.defaultHeight}
            cs={cs}
          />
        </ToggleSection>

        {/* False Facades */}
        <ToggleSection
          icon={PanelTop}
          label={f.t("product.falseFacade")}
          checked={f.falseFacadesEnabled}
          onChange={f.toggleFalseFacades}
        >
          <FalseFacadesEditor
            items={f.falseFacades}
            setItems={f.setFalseFacades}
            materials={f.bodyMaterials}
            t={f.t}
            defaultItem={{
              height: f.defaultHeight,
              depth: f.defaultDepth,
              materialId: f.defaultMaterialId,
            }}
            errors={f.falseFacadeErrors}
            cs={cs}
          />
        </ToggleSection>

        {/* Drawers */}
        <ToggleSection
          icon={Archive}
          label={f.t("product.drawers")}
          checked={f.drawersEnabled}
          onChange={f.toggleDrawers}
        >
          <DrawersEditor
            items={f.drawers}
            setItems={f.setDrawers}
            materials={f.bodyMaterials}
            t={f.t}
            slideHardware={f.slideHardware}
            tandemHardware={f.tandemHardware}
            defaultMaterialId={f.defaultMaterialId}
            errors={f.drawerErrors}
            cs={cs}
          />
        </ToggleSection>

        {/* Countertops */}
        <ToggleSection
          icon={UtensilsCrossed}
          label={f.t("product.countertop")}
          checked={f.countertopEnabled}
          onChange={(v) => {
            f.setCountertopEnabled(v);
            if (!v) f.setCountertops([]);
          }}
        >
          <CountertopsEditor
            items={f.countertops}
            setItems={f.setCountertops}
            materials={f.countertopMaterials}
            t={f.t}
            hasError={f.hasError}
            defaultWidth={f.defaultWidth}
            defaultDepth={f.defaultDepth}
            cs={cs}
          />
        </ToggleSection>

        {/* Extras */}
        <ToggleSection
          icon={PackagePlus}
          label={f.t("product.extras")}
          checked={f.extrasEnabled}
          onChange={f.toggleExtras}
        >
          <ExtrasEditor
            items={f.extras}
            setItems={f.setExtras}
            extraTypes={f.extraTypes}
            t={f.t}
            cs={cs}
          />
        </ToggleSection>
      </div>

      {/* ── save ── */}
      <div className="fixed inset-x-0 bottom-16 z-40 px-4 pb-3 pt-2 md:sticky md:bottom-4 md:px-0 md:pb-0 md:pt-0">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent md:hidden" />
        <Button
          size="lg"
          onClick={f.handleSave}
          disabled={f.saving}
          className="relative w-full shadow-xl"
        >
          {f.saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {f.t("common.save")}
        </Button>
      </div>

      {/* ── unsaved changes dialog ── */}
      <AlertDialog open={backOpen} onOpenChange={setBackOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{f.t("product.unsavedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {f.t("product.unsavedDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>{f.t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {f.t("product.leaveWithout")}
            </AlertDialogAction>
            <AlertDialogAction onClick={handleSaveAndLeave}>
              {f.t("product.saveAndLeave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
