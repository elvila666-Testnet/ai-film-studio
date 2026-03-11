import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "./lib/trpc";
import { Toaster } from "@/components/ui/toaster";
import { SonnerToaster } from "@/components/ui/sonner";
import { Home } from "./pages/Home";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { CostGuardProvider } from "@/components/FinOps/CostGuard";

import { Route, Switch } from "wouter";
import { BrandDashboard } from "./pages/BrandDashboard";
import { AIProcessingProvider } from "./lib/aiProcessingContext";
import { AIProcessingModal } from "./components/ui/AIProcessingModal";

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${window.location.origin}/api/trpc`,
          headers() {
            return {
              'content-type': 'application/json',
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AIProcessingProvider>
          <CostGuardProvider>
            <ErrorBoundary>
              <Switch>
                <Route path="/brand" component={BrandDashboard} />
                <Route path="/" component={Home} />
                {/* Fallback to Home for any other route */}
                <Route><Home /></Route>
              </Switch>
              <Toaster />
              <SonnerToaster />
              <AIProcessingModal />
            </ErrorBoundary>
          </CostGuardProvider>
        </AIProcessingProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;

