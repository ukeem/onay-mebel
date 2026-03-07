"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const UserMaterialsTab = dynamic(
  () => import("./materials-tab").then((m) => m.UserMaterialsTab),
  { ssr: false },
);
const UserHardwareTab = dynamic(
  () => import("./hardware-tab").then((m) => m.UserHardwareTab),
  { ssr: false },
);
const UserServiceTab = dynamic(
  () => import("./service-tab").then((m) => m.UserServiceTab),
  { ssr: false },
);
const TiersTab = dynamic(() => import("./tiers-tab").then((m) => m.TiersTab), {
  ssr: false,
});

export default function SettingsPage() {
  const t = useTranslations();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("settings.title")}
      </h1>
      <Tabs defaultValue="materials" className="w-full">
        <TabsList variant="line" className="w-full border-b">
          <TabsTrigger value="materials" className="flex-1">
            {t("settings.materials")}
          </TabsTrigger>
          <TabsTrigger value="hardware" className="flex-1">
            {t("settings.hardware")}
          </TabsTrigger>
          <TabsTrigger value="service" className="flex-1">
            {t("settings.services")}
          </TabsTrigger>
          <TabsTrigger value="tiers" className="flex-1">
            {t("settings.tiers.title")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="materials" className="pt-4">
          <UserMaterialsTab />
        </TabsContent>
        <TabsContent value="hardware" className="pt-4">
          <UserHardwareTab />
        </TabsContent>
        <TabsContent value="service" className="pt-4">
          <UserServiceTab />
        </TabsContent>
        <TabsContent value="tiers" className="pt-4">
          <TiersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
