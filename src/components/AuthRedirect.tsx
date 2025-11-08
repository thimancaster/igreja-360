// src/components/AuthRedirect.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole'; // Importar o hook de Role
import LoadingSpinner from '@/components/LoadingSpinner';

export const AuthRedirect: React.FC = () => {
  const { session, loading: authLoading, profile } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useRole(); // Usar o hook de Role
  const navigate = useNavigate();

  useEffect(() => {
    // Aguardar o fim de AMBOS os carregamentos
    if (authLoading || roleLoading) {
      return;
    }

    if (!session) {
      // Se não há sessão, vai para o login
      navigate('/auth');
    } else {
      // Se tem sessão:
      if (isAdmin) {
        // Se for ADMIN, vai direto para o dashboard (admin não precisa de igreja associada)
        navigate('/app/dashboard');
      } else if (!profile?.church_id) {
        // Se NÃO for admin E NÃO tem igreja, força a criação
        navigate('/create-church');
      } else {
        // Se NÃO for admin E TEM igreja, vai para o dashboard
        navigate('/app/dashboard');
      }
    }
  }, [session, authLoading, profile, isAdmin, roleLoading, navigate]);

  // Mostrar um spinner de carregamento universal
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
};
