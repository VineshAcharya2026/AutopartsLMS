"use client";

import { useEffect } from "react";
import { WS_URL } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

export function useNotifications() {
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token || typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let closed = false;

    try {
      ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      ws.onerror = () => {
        /* backend or websocket may be offline */
      };
    } catch {
      return;
    }

    const interval = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
    }, 30000);

    return () => {
      closed = true;
      clearInterval(interval);
      if (ws && !closed) ws.close();
    };
  }, [token]);

  return { notifications: [], unreadCount: 0 };
}
