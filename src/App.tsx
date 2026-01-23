// src/App.tsx
// --- VERSÃO COM LAZY LOADING PARA REDUZIR BUNDLE SIZE ---

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthRedirect } from '@/components/AuthRedirect';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';

import { AppLayout } from '@/components/AppLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

// Lazy loading para reduzir bundle inicial - páginas carregadas sob demanda
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AuthPage = lazy(() => import('@/pages/Auth'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Transacoes = lazy(() => import('@/pages/Transacoes'));
const Membros = lazy(() => import('@/pages/Membros'));
const Contribuicoes = lazy(() => import('@/pages/Contribuicoes'));
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
const FAQPage = lazy(() => import('@/pages/FAQPage'));

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <InstallPrompt />
          <AuthProvider>
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoadingSpinner size="lg" /></div>}>
              <Routes>
                {/* Rotas Públicas */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/faq" element={<FAQPage />} />

                {/* Rota raiz: redireciona dependendo do auth */}
                <Route path="/" element={<AuthRedirect />} /> 

                {/* Rotas protegidas com layout (sidebar + header) */}
                <Route path="/app/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
                <Route path="/app/transacoes" element={<ProtectedRoute><AppLayout><Transacoes /></AppLayout></ProtectedRoute>} />
                <Route path="/app/membros" element={<ProtectedRoute><AppLayout><Membros /></AppLayout></ProtectedRoute>} />
                <Route path="/app/contribuicoes" element={<ProtectedRoute><AppLayout><Contribuicoes /></AppLayout></ProtectedRoute>} />
                <Route path="/app/importacao" element={<ProtectedRoute><AppLayout><Importacao /></AppLayout></ProtectedRoute>} />
                <Route path="/app/integracoes" element={<ProtectedRoute><AppLayout><Integracoes /></AppLayout></ProtectedRoute>} />
                <Route path="/app/relatorios" element={<ProtectedRoute><AppLayout><Relatorios /></AppLayout></ProtectedRoute>} />
                <Route path="/app/admin" element={<ProtectedRoute><AdminRoute><AppLayout><Admin /></AppLayout></AdminRoute></ProtectedRoute>} />
                <Route path="/app/admin/usuarios" element={<ProtectedRoute><AdminRoute><AppLayout><GerenciarUsuarios /></AppLayout></AdminRoute></ProtectedRoute>} />
                <Route path="/app/admin/ministerios" element={<ProtectedRoute><AdminRoute><AppLayout><GerenciarMinisterios /></AppLayout></AdminRoute></ProtectedRoute>} />
                <Route path="/app/admin/igreja" element={<ProtectedRoute><AdminRoute><AppLayout><GerenciarIgreja /></AppLayout></AdminRoute></ProtectedRoute>} />
                <Route path="/app/admin/categorias" element={<ProtectedRoute><AdminRoute><AppLayout><GerenciarCategorias /></AppLayout></AdminRoute></ProtectedRoute>} />
                <Route path="/app/admin/dados" element={<ProtectedRoute><AdminRoute><AppLayout><GerenciarDados /></AppLayout></AdminRoute></ProtectedRoute>} />
                <Route path="/app/admin/configuracoes-sistema" element={<ProtectedRoute><AdminRoute><AppLayout><ConfiguracoesSistema /></AppLayout></AdminRoute></ProtectedRoute>} />
                <Route path="/app/configuracoes" element={<ProtectedRoute><AppLayout><Configuracoes /></AppLayout></ProtectedRoute>} />
                <Route path="/app/*" element={<ProtectedRoute><AppLayout><NotFound /></AppLayout></ProtectedRoute>} />

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
