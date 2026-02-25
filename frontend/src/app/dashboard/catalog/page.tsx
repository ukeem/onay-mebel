"use client";

import { TypeCrud } from "@/components/catalog/type-crud";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const DynamicLoading = () => (
  <div className="flex justify-center py-12">
    <Spinner className="h-8 w-8" />
  </div>
);

const MaterialsCrud = dynamic(
  () =>
    import("@/components/catalog/materials-crud").then((m) => m.MaterialsCrud),
  { ssr: false, loading: DynamicLoading },
);
const HardwareCrud = dynamic(
  () =>
    import("@/components/catalog/hardware-crud").then((m) => m.HardwareCrud),
  { ssr: false, loading: DynamicLoading },
);
const ServiceTemplateCrud = dynamic(
  () =>
    import("@/components/catalog/service-template-crud").then(
      (m) => m.ServiceTemplateCrud,
    ),
  { ssr: false, loading: DynamicLoading },
);

export default function CatalogPage() {
  const t = useTranslations();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("catalog.title")}
      </h1>
      <Tabs defaultValue="types" className="w-full">
        <TabsList variant="line" className="w-full border-b">
          <TabsTrigger value="types" className="flex-1">
            {t("catalog.types")}
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex-1">
            {t("catalog.materials")}
          </TabsTrigger>
          <TabsTrigger value="hardware" className="flex-1">
            {t("catalog.hardware")}
          </TabsTrigger>
          <TabsTrigger value="services" className="flex-1">
            {t("catalog.services")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-6 pt-4">
          <TypeCrud
            endpoint="/catalog/room-types"
            title={t("catalog.roomTypes")}
          />
          <TypeCrud
            endpoint="/catalog/product-types"
            title={t("catalog.productTypes")}
          />
          <TypeCrud
            endpoint="/catalog/material-types"
            title={t("catalog.materialTypes")}
          />
          <TypeCrud
            endpoint="/catalog/hardware-types"
            title={t("catalog.hardwareTypes")}
          />
          <TypeCrud
            endpoint="/catalog/extra-types"
            title={t("catalog.extraTypes")}
          />
        </TabsContent>

        <TabsContent value="materials" className="pt-4">
          <MaterialsCrud />
        </TabsContent>

        <TabsContent value="hardware" className="pt-4">
          <HardwareCrud />
        </TabsContent>

        <TabsContent value="services" className="pt-4">
          <ServiceTemplateCrud />
        </TabsContent>
      </Tabs>
    </div>
  );
}
