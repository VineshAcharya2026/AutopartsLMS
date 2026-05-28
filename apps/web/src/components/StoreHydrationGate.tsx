"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/branding";
import { useAuthStore, useUIStore } from "@/lib/store";

export function useStoreHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let authDone = useAuthStore.persist.hasHydrated();
    let uiDone = useUIStore.persist.hasHydrated();

    const maybeFinish = () => {
      if (authDone && uiDone) setHydrated(true);
    };

    const unsubAuth = useAuthStore.persist.onFinishHydration(() => {
      authDone = true;
      maybeFinish();
    });
    const unsubUI = useUIStore.persist.onFinishHydration(() => {
      uiDone = true;
      maybeFinish();
    });

    useAuthStore.persist.rehydrate();
    useUIStore.persist.rehydrate();
    maybeFinish();

    return () => {
      unsubAuth();
      unsubUI();
    };
  }, []);

  return hydrated;
}

export function StoreHydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useStoreHydration();
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading {APP_NAME}...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
