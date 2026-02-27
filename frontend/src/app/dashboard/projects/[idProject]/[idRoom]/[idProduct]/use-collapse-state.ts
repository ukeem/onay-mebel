"use client";

import { useCallback, useState } from "react";

const STORAGE_PREFIX = "collapse:";

/**
 * Persists the set of **expanded** item keys per product in localStorage.
 * Items not in the set are collapsed by default.
 * New items (no id) are always expanded.
 */
export function useCollapseState(productId: string) {
  const storageKey = STORAGE_PREFIX + productId;

  const readStorage = (): Set<string> => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    return new Set();
  };

  const [expanded, setExpanded] = useState<Set<string>>(readStorage);

  const persist = useCallback(
    (next: Set<string>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* quota exceeded — ignore */
      }
    },
    [storageKey],
  );

  /** Toggle a single key. Returns the new collapsed state. */
  const toggle = useCallback(
    (key: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Mark a key as expanded (e.g. when a new item is added). */
  const expand = useCallback(
    (key: string) => {
      setExpanded((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Check whether a key is collapsed. Keys not in the expanded set default to collapsed. */
  const isCollapsed = useCallback(
    (key: string) => !expanded.has(key),
    [expanded],
  );

  return { isCollapsed, toggle, expand, expanded };
}

export type CollapseState = ReturnType<typeof useCollapseState>;
