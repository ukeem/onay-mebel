"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ArrowLeft, Download, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/api";
import { shortenUrl } from "@/lib/shorten-url";

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
  const [enabledTiers, setEnabledTiers] = useState<Tier[]>([
    "standard",
    "comfort",
    "premium",
  ]);
  const [totals, setTotals] = useState<Record<Tier, string>>({
    standard: "",
    comfort: "",
    premium: "",
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoaded = useRef(false);
  const htmlUrlRef = useRef("");
  const activeTierRef = useRef<Tier>(activeTier);
  activeTierRef.current = activeTier;

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

        // Detect which tiers are enabled from the generated HTML
        const allTiers: Tier[] = ["standard", "comfort", "premium"];
        const detected = allTiers.filter((tier) =>
          withAbsoluteUploads.includes(`id="tab-btn-${tier}"`),
        );
        if (detected.length > 0) {
          setEnabledTiers(detected);
          setActiveTier(detected.includes("comfort") ? "comfort" : detected[0]);
        }

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
      (iframeRef.current?.contentWindow as any)?.showTab?.(
        activeTierRef.current,
      );
    } catch {
      /* cross-origin fallback */
    }
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
    // Extract company name from HTML for branded URL
    const companyMatch = rawHtml?.match(/class="company-name">([^<]+)<\/div>/);
    const companyName = companyMatch?.[1]?.trim() || "";
    const slug = companyName
      ? encodeURIComponent(companyName.replace(/\s+/g, "_"))
      : "proposal";
    const publicUrl = `${window.location.origin}/${slug}/${idDetail}`;
    const shortUrl = await shortenUrl(publicUrl);
    const titleMatch = rawHtml?.match(
      /<title>[^\u2014]*\u2014\s*(.+?)<\/title>/,
    );
    const projectName = titleMatch?.[1]?.trim() || t("proposal.title");
    const header = companyName
      ? `${companyName} — ${projectName}`
      : projectName;
    const shareText = `${header}\n${shortUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: header, url: shortUrl });
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

  const handleDownload = () => {
    if (!rawHtml) return;
    // Inject CSS to show all tiers sequentially (like print mode but for screen)
    const downloadCss = `
      <style>
        .tabs-wrap { display: none !important; }
        .total-bar { display: none !important; }
        .tab-content { display: block !important; margin-bottom: 0; }

        /* ── Each tier wrapped in a visual card ── */
        .tab-content {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 28px 24px 24px;
          margin-top: 28px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          text-align: center;
          position: relative;
          overflow: visible;
        }
        .tab-content > *:not(.tier-title):not(.tier-total) { text-align: left; }

        /* ── Tier badge ── */
        .tier-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          padding: 10px 32px;
          margin: -44px auto 24px;
          border-radius: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
          position: relative;
          z-index: 2;
        }

        /* ── Unique color per tier ── */
        #tab-standard .tier-title {
          background: linear-gradient(135deg, #6366f1, #818cf8);
        }
        #tab-comfort .tier-title {
          background: linear-gradient(135deg, #f59e0b, #fbbf24);
          color: #1a1a2e;
        }
        #tab-premium .tier-title {
          background: linear-gradient(135deg, #ec4899, #f472b6);
        }

        /* ── Tier total ── */
        .tier-total {
          display: flex;
          justify-content: center;
          padding: 20px 24px;
          margin-top: 20px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 14px;
        }
        .tier-total .total-inner-bar { gap: 14px; justify-content: center; }
        .tier-total .total-label { font-size: 15px; font-weight: 700; color: var(--text-secondary); }
        .tier-total .grand-new { font-size: 24px; font-weight: 800; }

        /* ── Payment sections all visible ── */
        .payment-section { display: block !important; margin-top: 28px; }

        /* ── Room blocks inside card ── */
        .tab-content .room-block { margin-bottom: 16px; }
        .tab-content .product-block {
          border-color: var(--border);
          background: var(--bg);
        }

        /* ── Remove page bottom padding (no fixed bar) ── */
        .page-wrapper { padding-bottom: 32px; }
      </style>`;
    const downloadHtml = rawHtml.replace("</head>", `${downloadCss}</head>`);
    const blob = new Blob([downloadHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Extract project name for filename
    const titleMatch = rawHtml.match(
      /<title>[^\u2014]*\u2014\s*(.+?)<\/title>/,
    );
    const projectName = titleMatch?.[1]?.trim() || "proposal";
    a.download = `${projectName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      {enabledTiers.length > 1 && (
        <Tabs
          value={activeTier}
          onValueChange={(v) => switchTier(v as Tier)}
          className="shrink-0"
        >
          <TabsList className="flex w-full shadow-sm">
            {enabledTiers.map((tier) => (
              <TabsTrigger key={tier} value={tier}>
                {t(`detail.tiers.${tier}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

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
      {/* Bottom bar: total + actions */}
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
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            className="h-8 w-8 rounded-full bg-green-600 text-white shadow-md hover:bg-green-700 hover:shadow-lg transition-all"
            aria-label={t("proposal.downloadHtml")}
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-8 w-8 rounded-full bg-neutral-900 text-white shadow-md hover:bg-neutral-800 hover:shadow-lg transition-all dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            aria-label={t("proposal.share")}
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
