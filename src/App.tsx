// src/App.tsx
// --- VERSÃO COM LAZY LOADING PARA REDUZIR BUNDLE SIZE ---

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

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';

import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Lazy loading para reduzir bundle inicial - páginas carregadas sob demanda
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AuthPage = lazy(() => import('@/pages/Auth'));
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
const GerenciarCategorias = lazy(() => import('@/pages/admin/GerenciarCategorias'));
const GerenciarDados = lazy(() => import('@/pages/admin/GerenciarDados'));
const ConfiguracoesSistema = lazy(() => import('@/pages/admin/ConfiguracoesSistema'));
const CreateChurchPage = lazy(() => import('@/pages/CreateChurch'));
const ChurchConfirmation = lazy(() => import('@/pages/ChurchConfirmation'));
const SelectChurch = lazy(() => import('@/pages/SelectChurch'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));

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
                              <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
                              <Route path="admin/usuarios" element={<AdminRoute><GerenciarUsuarios /></AdminRoute>} />
                              <Route path="admin/ministerios" element={<AdminRoute><GerenciarMinisterios /></AdminRoute>} />
                              <Route path="admin/igreja" element={<AdminRoute><GerenciarIgreja /></AdminRoute>} />
                              <Route path="admin/categorias" element={<AdminRoute><GerenciarCategorias /></AdminRoute>} />
                              <Route path="admin/dados" element={<AdminRoute><GerenciarDados /></AdminRoute>} />
                              <Route path="admin/configuracoes-sistema" element={<AdminRoute><ConfiguracoesSistema /></AdminRoute>} />
                              <Route path="configuracoes" element={<Configuracoes />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </div>
                        </div>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />

                {/* Rotas de fluxo de criação/seleção (fora do layout principal) */}
                <Route path="/create-church" element={<ProtectedRoute><CreateChurchPage /></ProtectedRoute>} />
                <Route path="/church-confirmation" element={<ProtectedRoute><ChurchConfirmation /></ProtectedRoute>} />
                <Route path="/select-church" element={<ProtectedRoute><SelectChurch /></ProtectedRoute>} />

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
