import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const AuthRedirect: React.FC = () => {
  const { session, loading: authLoading, profile } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Só considerar roleLoading quando já temos um usuário
  const effectiveRoleLoading = session?.user ? roleLoading : false;
  
  // Loading completo = auth loading OU (tem user E role ainda está carregando)
  const isFullyLoading = authLoading || (session?.user && effectiveRoleLoading);

  // Timeout de segurança para evitar loading infinito
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isFullyLoading) {
        console.warn('Auth timeout - redirecting to login');
        setHasTimedOut(true);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isFullyLoading]);

  useEffect(() => {
    // Se deu timeout, redirecionar para auth
    if (hasTimedOut) {
      navigate('/auth');
      return;
    }

    // Aguardar o fim do carregamento
    if (isFullyLoading) {
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
  }, [session, isFullyLoading, profile, isAdmin, hasTimedOut, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
};
