"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ArrowLeft, Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/api";

type Tier = "standard" | "comfort" | "premium";

export default function ProposalPage({
  params,
}: {
  params: Promise<{ idProject: string; idDetail: string }>;
}) {
  const { idProject, idDetail } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const [rawHtml, setRawHtml] = useState("");
  const [htmlUrl, setHtmlUrl] = useState("");
  const [error, setError] = useState(false);
  const [activeTier, setActiveTier] = useState<Tier>("standard");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoaded = useRef(false);
  const htmlUrlRef = useRef("");

  useEffect(() => {
    api
      .get<string>(`/calculations/${idDetail}/proposal`, {
        responseType: "text" as const,
      })
      .then(({ data: html }) => {
        setRawHtml(html);
        // Hide the in-HTML tabs — React tabs handle switching
        const modified = html.replace(
          "</head>",
          "<style>.tabs-wrap{display:none!important}</style></head>",
        );
        const blob = new Blob([modified], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        htmlUrlRef.current = url;
        setHtmlUrl(url);
      })
      .catch(() => {
        setError(true);
      });

    return () => {
      if (htmlUrlRef.current) URL.revokeObjectURL(htmlUrlRef.current);
    };
  }, [idDetail]);

  const handleIframeLoad = useCallback(() => {
    iframeLoaded.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (iframeRef.current?.contentWindow as any)?.showTab?.(activeTier);
    } catch {
      /* cross-origin fallback */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTier = useCallback((tier: Tier) => {
    setActiveTier(tier);
    if (iframeLoaded.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (iframeRef.current?.contentWindow as any)?.showTab?.(tier);
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  const handleDownload = () => {
    if (rawHtml) {
      const blob = new Blob([rawHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extract project name from <title> for a cleaner filename
      const titleMatch = rawHtml.match(/<title>[^—]*—\s*(.+?)<\/title>/);
      const projectName = titleMatch?.[1]?.trim() || idDetail;
      const date = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-");
      a.download = `КП — ${projectName} (${date}).html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] md:h-[calc(100vh-6rem)] flex-col">
      {/* toolbar */}
      <div className="sticky top-12 md:top-0 z-20 flex items-center gap-3 bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.back")}
          onClick={() =>
            router.push(`/dashboard/projects/${idProject}/details/${idDetail}`)
          }
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex-1 text-md leading-6 font-semibold">
          {t("proposal.title")}
        </h1>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 sm:h-auto sm:w-auto sm:px-3"
          aria-label={t("proposal.print")}
          onClick={handlePrint}
        >
          <Printer className="h-3 w-3" />
          <span className="ml-1 hidden sm:inline">{t("proposal.print")}</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 sm:h-auto sm:w-auto sm:px-3"
          aria-label={t("proposal.downloadHtml")}
          onClick={handleDownload}
        >
          <Download className="h-3 w-3" />
          <span className="ml-1 hidden sm:inline">
            {t("proposal.downloadHtml")}
          </span>
        </Button>
      </div>

      {/* Tier tabs */}
      <Tabs
        value={activeTier}
        onValueChange={(v) => switchTier(v as Tier)}
        className="shrink-0"
      >
        <TabsList className="flex w-full shadow-sm">
          <TabsTrigger value="standard">
            {t("detail.tiers.standard")}
          </TabsTrigger>
          <TabsTrigger value="comfort">{t("detail.tiers.comfort")}</TabsTrigger>
          <TabsTrigger value="premium">{t("detail.tiers.premium")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* iframe */}
      {htmlUrl ? (
        <iframe
          ref={iframeRef}
          id="proposal-frame"
          src={htmlUrl}
          sandbox="allow-scripts allow-same-origin"
          className="mt-2 flex-1 rounded-md border bg-white"
          title={t("proposal.title")}
          onLoad={handleIframeLoad}
        />
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-8 w-8" />
          <p>{t("detail.loadError")}</p>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      )}
    </div>
  );
}
