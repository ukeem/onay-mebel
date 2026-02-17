"use client";

import { use, useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { API_BASE_URL } from "@/lib/constants";
import { AlertTriangle } from "lucide-react";

const API_URL = API_BASE_URL;

export default function PublicProposalPage({
  params,
}: {
  params: Promise<{ idDetail: string }>;
}) {
  const { idDetail } = use(params);
  const [htmlUrl, setHtmlUrl] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/public/proposal/${idDetail}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.blob();
      })
      .then((blob) => {
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
