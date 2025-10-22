import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Transacoes from "./pages/Transacoes";
import Importacao from "./pages/Importacao";
import Integracoes from "./pages/Integracoes";
import Relatorios from "./pages/Relatorios";
import Admin from "./pages/Admin";
import GerenciarUsuarios from "./pages/admin/GerenciarUsuarios";
import GerenciarMinisterios from "./pages/admin/GerenciarMinisterios";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import { queryClient } from "./lib/queryClient"; // Importando o queryClient

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SidebarProvider defaultOpen={true}>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col">
                        <AppHeader />
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/transacoes" element={<Transacoes />} />
                          <Route path="/importacao" element={<Importacao />} />
                          <Route path="/integracoes" element={<Integracoes />} />
                          <Route path="/relatorios" element={<Relatorios />} />
                          <Route path="/admin" element={<Admin />} />
                          <Route path="/admin/usuarios" element={<GerenciarUsuarios />} />
                          <Route path="/admin/ministerios" element={<GerenciarMinisterios />} />
                          <Route path="/configuracoes" element={<Configuracoes />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;