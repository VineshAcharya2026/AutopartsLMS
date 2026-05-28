"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@centercrm/shared-types";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    { name: "centercrm-auth" }
  )
);

interface UIState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  leadView: "table" | "card" | "kanban" | "agent";
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLeadView: (view: UIState["leadView"]) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "light",
      sidebarOpen: true,
      leadView: "kanban",
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        document.documentElement.classList.toggle("dark", next === "dark");
        set({ theme: next });
      },
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setLeadView: (leadView) => set({ leadView }),
    }),
    { name: "centercrm-ui" }
  )
);
