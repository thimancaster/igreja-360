// src/App.tsx
// --- VERSÃO CORRIGIDA E ALINHADA COM O LAYOUT /app ---

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/ui/sidebar';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthRedirect } from '@/components/AuthRedirect';

// Usar import nomeado (named export) como está no seu ficheiro
import { ProtectedRoute } from '@/components/ProtectedRoute'; 

import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import LoadingSpinner from '@/components/LoadingSpinner'; // Importar o Spinner

// Lazy load das páginas
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Auth = lazy(() => import('@/pages/Auth'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Transacoes = lazy(() => import('@/pages/Transacoes'));
const Integracoes = lazy(() => import('@/pages/Integracoes'));
const Importacao = lazy(() => import('@/pages/Importacao'));
const Relatorios = lazy(() => import('@/pages/Relatorios'));
const Configuracoes = lazy(() => import('@/pages/Configuracoes'));
const Admin = lazy(() => import('@/pages/Admin'));
const GerenciarUsuarios = lazy(() => import('@/pages/admin/GerenciarUsuarios'));
const GerenciarMinisterios = lazy(() => import('@/pages/admin/GerenciarMinisterios'));
const GerenciarIgreja = lazy(() => import('@/pages/admin/GerenciarIgreja'));
const GerenciarCategorias = lazy(() => import('@/pages/admin/GerenciarCategorias')); // Adicionada
const CreateChurchPage = lazy(() => import('@/pages/CreateChurch'));
const ChurchConfirmation = lazy(() => import('@/pages/ChurchConfirmation'));
const LandingPage = lazy(() => import('@/pages/LandingPage')); // Adicionada

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
                <Route path="/auth" element={<Auth />} />
                <Route path="/landing" element={<LandingPage />} /> {/* Rota para a Landing Page */}

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
                              <Route path="admin/categorias" element={<GerenciarCategorias />} /> {/* Rota Adicionada */}
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
