import { AxiosError } from "axios";

/**
 * Extract a user-friendly error message from an unknown catch value.
 * Handles AxiosError (with single or array messages), native Error, and strings.
 */
export function getApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg) && typeof msg[0] === "string") return msg[0];
  }

  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  return fallback;
}
