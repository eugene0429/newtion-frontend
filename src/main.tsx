import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        const message = error instanceof Error ? error.message : "오류";
        toast.error(message);
      },
    },
  },
});

async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCK === "true") {
    const { startMockServiceWorker } = await import("./mocks/browser");
    await startMockServiceWorker();
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
