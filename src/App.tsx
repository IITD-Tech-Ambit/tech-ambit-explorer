import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Directory from "./pages/Directory";
import Magazines from "./pages/Magazines";
import MagazineDetail from "./pages/MagazineDetail";
import Mindmap from "./pages/Mindmap";
import NotFound from "./pages/NotFound";

// Configure React Query with production-ready defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time (formerly cacheTime)
      retry: 2, // Retry failed requests twice
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch when reconnecting to the internet
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/magazines" element={<Magazines />} />
          <Route path="/magazines/:id" element={<MagazineDetail />} />
          <Route path="/mindmap" element={<Mindmap />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    {/* React Query DevTools - only visible in development */}
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);

export default App;
