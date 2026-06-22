import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
//import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Directory from "./pages/Directory";
import FacultyProfile from "./pages/FacultyProfile";
import Magazines from "./pages/Magazines";
import MagazineDetail from "./pages/MagazineDetail";
import Mindmap from "./pages/Mindmap";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import Contributors from "./pages/Contributors";
import NotFound from "./pages/NotFound";
import SuggestionModal from "./components/SuggestionModal";
import ChatbotWidget from "./components/chat/ChatbotWidget";
import { ThemeProvider } from "./components/theme-provider";

// Configure React Query with production-ready defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => {
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/faculty/:kerberos" element={<FacultyProfile />} />
            <Route path="/magazines" element={<Magazines />} />
            <Route path="/magazines/:id" element={<MagazineDetail />} />
            <Route path="/mindmap" element={<Mindmap />} />
            <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
            <Route path="/contributors" element={<Contributors />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>

        {/* ── Global floating Suggestions button (below the chatbot FAB) ── */}
        <button
          onClick={() => setSuggestionOpen(true)}
          aria-label="Open suggestions and feedback"
          title="Suggestions"
          className="fixed bottom-6 right-6 z-[150] flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 active:scale-95 transition-all duration-200"
          style={{ boxShadow: "0 8px 32px -8px hsl(222 78% 48% / 0.45)" }}
        >
          <Lightbulb className="w-4 h-4 flex-shrink-0" />
        </button>

        <SuggestionModal
          open={suggestionOpen}
          onClose={() => setSuggestionOpen(false)}
        />

        {/* ── Global RAG research chatbot ── */}
        <ChatbotWidget />
      </TooltipProvider>
      {/* React Query DevTools - only visible in development */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
