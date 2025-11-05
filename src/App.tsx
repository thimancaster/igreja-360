// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/ui/sidebar';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthRedirect } from '@/components/AuthRedirect'; // Assumindo que este componente existe

// Ajuste a importação de acordo com como ProtectedRoute é exportado:
// Se for export default use: import ProtectedRoute from '@/components/ProtectedRoute';
import { ProtectedRoute } from '@/components/ProtectedRoute'; // Usando como exportação nomeada

import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';

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
const CreateChurchPage = lazy(() => import('@/pages/CreateChurch'));
const ChurchConfirmation = lazy(() => import('@/pages/ChurchConfirmation'));

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Carregando...</div>}>
              <Routes>
                {/* Rota pública para autenticação */}
                <Route path="/auth" element={<Auth />} />

                {/* Rota raiz: redireciona dependendo do auth */}
                {/* Se AuthRedirect não existir, podemos ajustar isso depois */}
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
                              <Route path="configuracoes" element={<Configuracoes />} />
                              <Route path="create-church" element={<CreateChurchPage />} />
                              <Route path="church-confirmation" element={<ChurchConfirmation />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </div>
                        </div>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />

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
