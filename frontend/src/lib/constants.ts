/**
 * Base URL of the backend API / WebSocket server.
 * Single source of truth — import this instead of repeating the env fallback.
 *
 * Empty string = relative URLs (requests go to the same origin via nginx).
 * Set NEXT_PUBLIC_API_URL only when frontend and backend are on different domains.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * WebSocket base URL. Computed from window.location at runtime
 * so it works on any domain without build-time configuration.
 */
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "");
