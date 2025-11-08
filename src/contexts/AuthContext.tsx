// src/contexts/AuthContext.tsx
// --- VERSÃO CORRIGIDA E UNIFICADA ---

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ProfileWithChurch, Tables } from '@/integrations/supabase/types'; // Importa o ProfileWithChurch
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Usar o tipo Profile simples (da tabela)
interface Profile extends Tables<'profiles'> {}

// 1. Interface AuthContextType completa e correta
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ProfileWithChurch | null; // <-- CORRIGIDO para usar o tipo com Join
  churchId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: ProfileWithChurch | null) => void; // <-- CORRIGIDO
  setChurchId: (churchId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileWithChurch | null>(null); // <-- CORRIGIDO
  const [churchId, setChurchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 2. fetchUserProfile CORRIGIDO para buscar o Join com 'churches'
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
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
        console.warn('Perfil não encontrado (normal para novos usuários):', error.message);
        setProfile(null);
        return null;
      }
      setProfile(data as ProfileWithChurch); // <-- CORRIGIDO
      return data as ProfileWithChurch; // <-- CORRIGIDO
    } catch (err) {
      console.error("Erro crítico em fetchProfile:", err);
      setProfile(null);
      return null;
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    // Lógica de getInitialSession robusta
    const getInitialSession = async () => {
      setLoading(true);
      try {
        const { data: { session: initialSession }, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) console.error("Erro ao buscar sessão:", getSessionError.message);

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const userProfile = await fetchUserProfile(initialSession.user.id);
          setChurchId(userProfile?.church_id || null);
        }
      } catch (error) {
        console.error("Erro no getInitialSession:", error);
        setProfile(null);
      } finally {
        setLoading(false); // Garante que o loading termina
      }
    };

    getInitialSession();

    // Listener de Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setLoading(true);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const userProfile = await fetchUserProfile(currentSession.user.id);
          setChurchId(userProfile?.church_id || null);
        } else {
          setProfile(null);
          setChurchId(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // --- Funções de Auth (signIn, signUp, signOut) ---
  // (Mantendo as suas funções originais que já funcionavam)
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
       const redirectUrl = `${window.location.origin}/app/dashboard`; // Rota correta

       const { data, error } = await supabase.auth.signUp({
         email,
         password,
         options: {
           emailRedirectTo: redirectUrl,
           data: {
             full_name: fullName, 
           },
         },
       });

       if (error) throw error;

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

       // Limpar estado localmente
       setSession(null);
       setUser(null);
       setProfile(null);
       setChurchId(null);
       queryClient.clear(); // Limpar cache
       navigate("/auth"); // Redirecionar para login

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
    user,
    session,
    profile,
    churchId, // Adicionando churchId
    loading,
    signIn,
    signUp,
    signOut,
    refetchProfile,
    setProfile,
    setChurchId, // Adicionando setChurchId
  };

  return (
    <AuthContext.Provider value={value}>
      {/* 3. CORREÇÃO CRÍTICA: Só renderiza a aplicação DEPOIS que o loading terminar */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
