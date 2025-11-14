// src/components/AuthRedirect.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { LoadingSpinner } from '@/components/LoadingSpinner'; // <-- CORREÇÃO: Adicionadas chaves {}

export const AuthRedirect: React.FC = () => {
  const { session, loading: authLoading, profile } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || roleLoading) {
      return;
    }

    if (!session) {
      navigate('/auth');
    } else {
      if (isAdmin) {
        navigate('/app/dashboard');
      } else if (!profile?.church_id) {
        navigate('/create-church');
      } else {
        navigate('/app/dashboard');
      }
    }
  }, [session, authLoading, profile, isAdmin, roleLoading, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
};
