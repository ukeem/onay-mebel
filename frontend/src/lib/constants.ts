/**
 * Base URL of the backend API.
 *
 * Always empty string = relative URLs.
 * Requests go to the same origin (e.g. /api/auth/login),
 * nginx proxies them to the backend container.
 *
 * DO NOT use process.env.NEXT_PUBLIC_API_URL here —
 * Next.js bakes it at build time and Docker cache makes it unreliable.
 */
export const API_BASE_URL = "";

/**
 * WebSocket base URL. Computed from window.location at runtime
 * so it works on any domain without build-time configuration.
 */
export const WS_BASE_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "";
