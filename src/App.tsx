// src/App.tsx
// --- VERSÃO CORRIGIDA E ALINHADA ---

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext'; // Importação correta
import ProtectedRoute from '@/components/ProtectedRoute'; // Importação correta

// Lazy loading das páginas
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Auth = lazy(() => import('@/pages/Auth'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Transacoes = lazy(() => import('@/pages/Transacoes'));
const Integracoes = lazy(() => import('@/pages/Integracoes'));
const Importacao = lazy(() => import('@/pages/Importacao'));
const Relatorios = lazy(() => import('@/pages/Relatorios'));
const Configuracoes = lazy(() => import('@/pages/Configuracoes'));
const Admin = lazy(() => import('@/pages/Admin'));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider> {/* AuthProvider envolve TUDO */}
          <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Carregando...</div>}>
            <Routes>
              {/* Rota pública de Autenticação */}
              <Route path="/auth" element={<Auth />} />

              {/* Rotas Protegidas */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/transacoes" element={<ProtectedRoute><Transacoes /></ProtectedRoute>} />
              <Route path="/integracoes" element={<ProtectedRoute><Integracoes /></ProtectedRoute>} />
              <Route path="/importacao" element={<ProtectedRoute><Importacao /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} /> {/* A lógica de role está no hook/sidebar, mas a rota deve ser protegida */}

              {/* Rota 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
