"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { StoreHydrationGate } from "@/components/StoreHydrationGate";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            enabled: typeof window !== "undefined",
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <StoreHydrationGate>{children}</StoreHydrationGate>
    </QueryClientProvider>
  );
}
