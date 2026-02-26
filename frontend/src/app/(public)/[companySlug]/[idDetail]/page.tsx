"use client";

import { use, useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { API_BASE_URL } from "@/lib/constants";
import { AlertTriangle } from "lucide-react";

const API_URL = API_BASE_URL;

/**
 * Branded public proposal page.
 * URL: /{companySlug}/{calculationId}
 * companySlug is purely cosmetic — the proposal is fetched by calculationId.
 */
export default function BrandedProposalPage({
  params,
}: {
  params: Promise<{ companySlug: string; idDetail: string }>;
}) {
  const { idDetail } = use(params);
  const [htmlUrl, setHtmlUrl] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/public/proposal/${idDetail}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.text();
      })
      .then((html) => {
        const withAbsoluteUploads = html.replace(
          /src="\/uploads\//g,
          `src="${window.location.origin}/uploads/`,
        );
        const blob = new Blob([withAbsoluteUploads], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        setHtmlUrl(url);
      })
      .catch(() => {
        setError(true);
      });

    return () => {
      if (htmlUrl) URL.revokeObjectURL(htmlUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idDetail]);

  return (
    <div className="min-h-screen">
      {htmlUrl ? (
        <iframe
          id="public-proposal-frame"
          src={htmlUrl}
          sandbox="allow-scripts allow-same-origin"
          className="h-screen w-full border-0"
          title="Коммерческое предложение"
        />
      ) : error ? (
        <div className="flex h-screen flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-8 w-8" />
          <p>Документ не найден</p>
        </div>
      ) : (
        <div className="flex h-screen items-center justify-center">
          <Spinner size="lg" className="border-blue-500" />
        </div>
      )}
    </div>
  );
}
