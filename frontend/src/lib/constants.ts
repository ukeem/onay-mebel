/**
 * Base URL of the backend API / WebSocket server.
 * Single source of truth — import this instead of repeating the env fallback.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost";
