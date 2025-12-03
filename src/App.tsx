// src/App.tsx
// --- VERSÃO COM IMPORT CORRIGIDO DO LOADING SPINNER ---

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/ui/sidebar';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthRedirect } from '@/components/AuthRedirect';

import { ProtectedRoute } from '@/components/ProtectedRoute';

import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner'; // <-- CORREÇÃO: Adicionadas chaves {}

// Importações diretas (sem lazy) para garantir o build
import Dashboard from '@/pages/Dashboard';
import AuthPage from '@/pages/Auth'; // Importação Default
import NotFound from '@/pages/NotFound';
import Transacoes from '@/pages/Transacoes';
import Integracoes from '@/pages/Integracoes';
import Importacao from '@/pages/Importacao';
import Relatorios from '@/pages/Relatorios';
import Configuracoes from '@/pages/Configuracoes';
import Admin from '@/pages/Admin';
import GerenciarUsuarios from '@/pages/admin/GerenciarUsuarios';
import GerenciarMinisterios from '@/pages/admin/GerenciarMinisterios';
import GerenciarIgreja from '@/pages/admin/GerenciarIgreja';
import GerenciarCategorias from '@/pages/admin/GerenciarCategorias';
import CreateChurchPage from '@/pages/CreateChurch';
import ChurchConfirmation from '@/pages/ChurchConfirmation';
import LandingPage from '@/pages/LandingPage';

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoadingSpinner size="lg" /></div>}>
              <Routes>
                {/* Rotas Públicas */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/landing" element={<LandingPage />} />

                {/* Rota raiz: redireciona dependendo do auth */}
                <Route path="/" element={<AuthRedirect />} /> 

                {/* Rotas protegidas com layout (sidebar + header) */}
                <Route
                  path="/app/*"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider defaultOpen={true}>
                        <div className="flex min-h-screen w-full">
                          <AppSidebar />
                          <div className="flex-1 flex flex-col">
                            <AppHeader />
                            <Routes>
                              <Route path="dashboard" element={<Dashboard />} />
                              <Route path="transacoes" element={<Transacoes />} />
                              <Route path="importacao" element={<Importacao />} />
                              <Route path="integracoes" element={<Integracoes />} />
                              <Route path="relatorios" element={<Relatorios />} />
                              <Route path="admin" element={<Admin />} />
                              <Route path="admin/usuarios" element={<GerenciarUsuarios />} />
                              <Route path="admin/ministerios" element={<GerenciarMinisterios />} />
                              <Route path="admin/igreja" element={<GerenciarIgreja />} />
                              <Route path="admin/categorias" element={<GerenciarCategorias />} />
                              <Route path="configuracoes" element={<Configuracoes />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </div>
                        </div>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />

                {/* Rotas de fluxo de criação (fora do layout principal) */}
                <Route path="/create-church" element={<ProtectedRoute><CreateChurchPage /></ProtectedRoute>} />
                <Route path="/church-confirmation" element={<ProtectedRoute><ChurchConfirmation /></ProtectedRoute>} />

                {/* Fallback global */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
