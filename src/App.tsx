import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import TaxonomyBrowse from "./pages/TaxonomyBrowse";
import Directory from "./pages/Directory";
import FacultyProfile from "./pages/FacultyProfile";
import Magazines from "./pages/Magazines";
import MagazineDetail from "./pages/MagazineDetail";
import Atlas from "./pages/Atlas";
import Contributors from "./pages/Contributors";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import SuggestionModal from "./components/SuggestionModal";
import ChatbotWidget from "./components/chat/ChatbotWidget";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./contexts/AuthContext";
import ScrollToTop from "./components/ScrollToTop";

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
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/explore/browse" element={<TaxonomyBrowse />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/atlas" element={<Atlas />} />
            <Route path="/faculty/:kerberos" element={<FacultyProfile />} />
            <Route path="/magazines" element={<Magazines />} />
            <Route path="/magazines/:id" element={<MagazineDetail />} />
            <Route path="/contributors" element={<Contributors />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
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
        <ChatbotWidget />
      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
