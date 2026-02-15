"use client";

import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

import { API_BASE_URL } from "@/lib/constants";

const WS_URL = API_BASE_URL;

export function useForceLogout() {
  const t = useTranslations();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    const socket = io(WS_URL, {
      transports: ["websocket"],
      withCredentials: true, // send httpOnly cookie for auth
    });

    socket.on("connect_error", (err) => {
      console.warn("[WS] connect_error:", err.message);
    });

    socket.on("error", (err: { message: string }) => {
      console.warn("[WS] error:", err.message);
    });

    socket.on("force-logout", (data: { message: string }) => {
      toast.warning(data.message || t("forceLogout.message"));
      // Call backend logout to clear cookies
      api.post("/auth/logout").catch(() => {});
      logout();
      router.replace("/login");
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, logout, router, t]);
}
