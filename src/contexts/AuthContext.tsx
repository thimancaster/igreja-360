// src/contexts/AuthContext.tsx
// --- VERSÃO COMPLETA E CORRIGIDA ---

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Define ProfileWithChurch type inline
type ProfileWithChurch = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  church_id: string | null;
  churches?: {
    id: string;
    name: string;
    owner_user_id: string;
  } | null;
};

// 1. Interface AuthContextType completa
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ProfileWithChurch | null;
  churchId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  const navigate = useNavigate();

  // Função para buscar perfil com os dados da igreja (join)
  // Agora recebe o objeto User para acessar user_metadata
  const fetchUserProfile = useCallback(async (currentUser: User) => {
    try {
      // Primeiro, tenta buscar o perfil existente
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          avatar_url,
          church_id,
          churches (id, name, owner_user_id)
        `
        )
        .eq('id', currentUser.id)
        .maybeSingle(); // Usa maybeSingle para lidar com a ausência de perfil existente

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 é "No rows found"
        console.warn('Erro ao buscar perfil:', fetchError.message);
        // Não lança erro, apenas retorna null para indicar que o perfil não foi encontrado ou houve um erro real
      }

      if (existingProfile) {
        return existingProfile as ProfileWithChurch;
      }

      // Se não houver perfil existente, cria um
      console.log(`Criando novo perfil para o usuário ${currentUser.id}`);
      
      const userMetadata = currentUser.user_metadata;
      const fullName = userMetadata?.full_name || `${userMetadata?.first_name || ''} ${userMetadata?.last_name || ''}`.trim() || currentUser.email;

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          full_name: fullName,
          avatar_url: userMetadata?.avatar_url || null,
        })
        .select(
          `
          id,
          full_name,
          avatar_url,
          church_id,
          churches (id, name, owner_user_id)
        `
        )
        .single(); // Usa single aqui, pois esperamos que um seja criado

      if (createError) {
        console.error('Erro ao criar perfil:', createError.message);
        return null;
      }

      return newProfile as ProfileWithChurch;

    } catch (error) {
      console.error('Erro catastrófico em fetchUserProfile:', error);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userProfile = await fetchUserProfile(user); // Passa o objeto user
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
        const userProfile = await fetchUserProfile(session.user); // Passa session.user
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
          const userProfile = await fetchUserProfile(session.user); // Passa session.user
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

  // --- Funções de Auth do seu código original ---
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });

    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`; // Redirecionar para a raiz

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName, // Garante que full_name seja passado
            first_name: fullName.split(' ')[0] || '',
            last_name: fullName.split(' ').slice(1).join(' ') || '',
          },
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Cadastro realizado!",
        description: "Bem-vindo ao Igreja360. Verifique seu email para confirmar a conta.",
      });

    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Não foi possível criar sua conta. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Até logo!",
        description: "Você foi desconectado com sucesso.",
      });

      // Limpar estado localmente imediatamente
      setSession(null);
      setUser(null);
      setProfile(null);
      setChurchId(null);
      queryClient.clear(); // Limpar cache do react-query
      navigate("/auth");

    } catch (error: any) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  // --- Fim das funções de Auth ---

  const value = {
    session,
    user,
    profile,
    churchId,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    setProfile,
    setChurchId,
  };

  // CORREÇÃO CRÍTICA: Renderiza children apenas quando !loading
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};