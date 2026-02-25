"use client";

import { useEffect } from "react";

/**
 * Перехватывает ChunkLoadError (устаревшие чанки после деплоя)
 * и автоматически перезагружает страницу один раз.
 */
export function ChunkErrorReloader() {
  useEffect(() => {
    const key = "__chunk_reload";

    function handleError(event: ErrorEvent) {
      const msg = event.error?.name || event.message || "";
      if (
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module")
      ) {
        // Перезагружаем один раз, чтобы не попасть в бесконечный цикл
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
        }
      }
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const msg =
        event.reason?.name || event.reason?.message || String(event.reason);
      if (
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module")
      ) {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
        }
      }
    }

    // Сбрасываем флаг при успешной загрузке
    sessionStorage.removeItem(key);

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
