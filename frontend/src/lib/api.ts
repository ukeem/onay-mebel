import axios, { type InternalAxiosRequestConfig } from "axios";

import { API_BASE_URL } from "@/lib/constants";

const API_URL = API_BASE_URL;

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // send httpOnly cookies automatically
  timeout: 15_000,
});

/* ─── Mutex for token refresh (prevents parallel refresh calls) ─── */

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    await axios.post(
      `${API_URL}/api/auth/refresh`,
      {},
      { withCredentials: true },
    );
    return true;
  } catch {
    return false;
  }
}

/* ─── Response interceptor: handle 401 → refresh → retry ─── */

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Use mutex — only one refresh at a time
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const success = await refreshPromise;

      if (success) {
        // Retry original request (new cookie is already set)
        return api(originalRequest);
      }

      // Refresh failed → redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
