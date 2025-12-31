"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "@upstash/realtime/client";
import { ReactNode, useState } from "react";

export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <RealtimeProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </RealtimeProvider>
  );
};
