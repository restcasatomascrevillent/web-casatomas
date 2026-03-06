import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CookieConsent from "./components/CookieConsent";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const queryClient = new QueryClient();
const Index = lazy(() => import("./pages/Index"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Reservas = lazy(() => import("./pages/Reservas"));
const PoliticaPrivacidad = lazy(() => import("./pages/PoliticaPrivacidad"));

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
    Cargando...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CookieConsent />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/reservas" element={<Reservas />} />
              <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
