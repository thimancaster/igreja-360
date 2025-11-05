// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ProfileWithChurch } from '@/integrations/supabase/types';

// 1. Interface corrigida para incluir os setters
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ProfileWithChurch | null;
  churchId: string | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: ProfileWithChurch | null) => void;
  setChurchId: (churchId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileWithChurch | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        first_name,
        last_name,
        church_id,
        churches (id, name, owner_user_id)
      `
      )
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil:', error.message);
      return null;
    }
    return data as ProfileWithChurch;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userProfile = await fetchUserProfile(user.id);
      setProfile(userProfile);
      setChurchId(userProfile?.church_id || null);
    } catch (error) {
      console.error('Falha ao atualizar perfil:', error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError.message);
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setProfile(userProfile);
        setChurchId(userProfile?.church_id || null);
      }

      setLoading(false);
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id);
          setProfile(userProfile);
          setChurchId(userProfile?.church_id || null);
        } else {
          setProfile(null);
          setChurchId(null);
        }

        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // 2. Objeto 'value' corrigido, incluindo TODOS os estados e setters
  const value = {
    session,
    user,
    profile,
    churchId,
    loading,
    refreshProfile,
    setProfile, // Setter exposto para o CreateChurchForm
    setChurchId, // Setter exposto para o CreateChurchForm
  };

  // 3. Renderiza children apenas quando !loading (como estava antes)
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
