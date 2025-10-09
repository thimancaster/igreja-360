import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import Dashboard from "./pages/Dashboard";
import Transacoes from "./pages/Transacoes";
import Importacao from "./pages/Importacao";
import Relatorios from "./pages/Relatorios";
import Admin from "./pages/Admin";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider defaultOpen={true}>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <AppHeader />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transacoes" element={<Transacoes />} />
                <Route path="/importacao" element={<Importacao />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
