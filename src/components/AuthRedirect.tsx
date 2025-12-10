import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const AuthRedirect: React.FC = () => {
  const { session, loading: authLoading, profile } = useAuth();
  const navigate = useNavigate();
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Timeout de segurança (5 segundos)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading) {
        console.warn('AuthRedirect: Timeout - forcing navigation');
        setHasTimedOut(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [authLoading]);

  useEffect(() => {
    // Se deu timeout, redirecionar para auth
    if (hasTimedOut) {
      console.log('AuthRedirect: Timeout occurred, redirecting to /auth');
      navigate('/auth', { replace: true });
      return;
    }

    // Aguardar apenas o auth loading (não esperar roles)
    if (authLoading) {
      console.log('AuthRedirect: Still loading auth...');
      return;
    }

    console.log('AuthRedirect: Auth loaded', { hasSession: !!session, hasChurch: !!profile?.church_id });

    if (!session) {
      // Sem sessão -> login
      navigate('/auth', { replace: true });
    } else if (!profile?.church_id) {
      // Com sessão mas sem igreja -> criar igreja
      navigate('/create-church', { replace: true });
    } else {
      // Com sessão e igreja -> dashboard
      navigate('/app/dashboard', { replace: true });
    }
  }, [session, authLoading, profile, hasTimedOut, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
};
