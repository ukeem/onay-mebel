"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ArrowLeft, Share2 } from "lucide-react";
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
  const [totals, setTotals] = useState<Record<Tier, string>>({
    standard: "",
    comfort: "",
    premium: "",
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoaded = useRef(false);
  const htmlUrlRef = useRef("");

  useEffect(() => {
    api
      .get<string>(`/calculations/${idDetail}/proposal`, {
        responseType: "text" as const,
      })
      .then(({ data: html }) => {
        const withAbsoluteUploads = html.replace(
          /src="\/uploads\//g,
          `src="${window.location.origin}/uploads/`,
        );
        setRawHtml(withAbsoluteUploads);

        // Extract totals per tier from HTML
        const tierNames: Tier[] = ["standard", "comfort", "premium"];
        const extracted = { standard: "", comfort: "", premium: "" };
        for (const tier of tierNames) {
          const re = new RegExp(
            `id="total-${tier}"[\\s\\S]*?class="grand-new"[^>]*>([\\s\\S]*?)</span>\\s*</`,
          );
          const m = withAbsoluteUploads.match(re);
          if (m) {
            // Strip inner HTML tags, decode &nbsp;
            extracted[tier] = m[1]
              .replace(/<[^>]+>/g, "")
              .replace(/&nbsp;/g, " ")
              .trim();
          }
        }
        setTotals(extracted);

        // Hide the in-HTML tabs + bottom total bar — React handles them
        const modified = withAbsoluteUploads.replace(
          "</head>",
          "<style>.tabs-wrap{display:none!important}.total-bar{display:none!important}</style></head>",
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
  }, []);

  const handleShare = async () => {
    const publicUrl = `${window.location.origin}/proposal/${idDetail}`;
    const titleMatch = rawHtml?.match(/<title>[^—]*—\s*(.+?)<\/title>/);
    const projectName = titleMatch?.[1]?.trim() || t("proposal.title");
    const shareText = `${projectName}\n${publicUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: projectName, url: publicUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      // Use sonner toast if available
      const { toast } = await import("sonner");
      toast.success(t("detail.linkCopied"));
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] flex-col">
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
      {/* Bottom bar: total + share */}
      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {totals[activeTier] ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">
              {t("detail.totalClientLabel")}
            </span>
            <span className="text-xl font-bold tracking-tight">
              {totals[activeTier]}
            </span>
          </div>
        ) : (
          <div />
        )}
        <Button
          size="sm"
          className="gap-1.5 rounded-full bg-green-600 px-4 text-white shadow-md hover:bg-green-700 hover:shadow-lg transition-all"
          aria-label={t("proposal.share")}
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
          <span>{t("proposal.share")}</span>
        </Button>
      </div>
    </div>
  );
}
