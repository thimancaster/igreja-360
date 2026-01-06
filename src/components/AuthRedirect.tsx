import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const AuthRedirect: React.FC = () => {
  const { session, user, loading: authLoading, profile, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isCheckingChurches, setIsCheckingChurches] = useState(false);

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
    const handleRedirect = async () => {
      // Se deu timeout, redirecionar para auth
      if (hasTimedOut) {
        console.log('AuthRedirect: Timeout occurred, redirecting to /auth');
        navigate('/auth', { replace: true });
        return;
      }

      // Aguardar auth loading
      if (authLoading) {
        console.log('AuthRedirect: Still loading auth...');
        return;
      }

      console.log('AuthRedirect: Auth loaded', { 
        hasSession: !!session, 
        hasProfile: !!profile,
        hasChurch: !!profile?.church_id 
      });

      // Sem sessão -> login
      if (!session) {
        navigate('/auth', { replace: true });
        return;
      }

      // Com sessão e igreja vinculada -> dashboard
      if (profile?.church_id) {
        navigate('/app/dashboard', { replace: true });
        return;
      }

      // Com sessão mas sem igreja vinculada -> verificar igrejas do owner
      if (user?.id && !isCheckingChurches) {
        setIsCheckingChurches(true);
        
        try {
          const { data: churches, error } = await supabase
            .from('churches')
            .select('id')
            .eq('owner_user_id', user.id);

          if (error) {
            console.error('AuthRedirect: Error fetching churches:', error);
            navigate('/create-church', { replace: true });
            return;
          }

          const churchCount = churches?.length || 0;
          console.log('AuthRedirect: Found churches for owner:', churchCount);

          if (churchCount === 0) {
            // Nenhuma igreja -> criar nova
            navigate('/create-church', { replace: true });
          } else if (churchCount === 1) {
            // Uma igreja -> vincular automaticamente
            const churchId = churches[0].id;
            console.log('AuthRedirect: Auto-linking single church:', churchId);
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ church_id: churchId })
              .eq('id', user.id);

            if (updateError) {
              console.error('AuthRedirect: Error linking church:', updateError);
              navigate('/create-church', { replace: true });
              return;
            }

            await refetchProfile();
            navigate('/app/dashboard', { replace: true });
          } else {
            // Múltiplas igrejas -> tela de escolha
            navigate('/select-church', { replace: true });
          }
        } catch (err) {
          console.error('AuthRedirect: Error in church check:', err);
          navigate('/create-church', { replace: true });
        }
      }
    };

    handleRedirect();
  }, [session, user, authLoading, profile, hasTimedOut, isCheckingChurches, navigate, refetchProfile]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
};
