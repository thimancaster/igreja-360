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
  profile: ProfileWithChurch | null | undefined; // Pode ser null (sem perfil) ou undefined (carregando)
  churchId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: ProfileWithChurch | null | undefined) => void; // Permitir undefined
  setChurchId: (churchId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileWithChurch | null | undefined>(undefined); // Inicia como undefined
  const [churchId, setChurchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Função para buscar perfil com os dados da igreja (join)
  // Agora recebe o objeto User para acessar user_metadata
  const fetchUserProfile = useCallback(async (currentUser: User): Promise<ProfileWithChurch | null> => {
    console.log("AuthContext: fetchUserProfile called for user:", currentUser.id);
    try {
      // 1. Primeiro, tenta buscar o perfil existente
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
        console.error('AuthContext: Erro ao buscar perfil existente:', fetchError.message);
        throw new Error(`Erro ao buscar perfil: ${fetchError.message}`); // Lança erros reais
      }

      if (existingProfile) {
        console.log('AuthContext: Perfil existente encontrado:', existingProfile);
        return existingProfile as ProfileWithChurch;
      }

      // 2. Se não houver perfil existente, cria um
      console.log(`AuthContext: Nenhum perfil existente encontrado, criando novo para o usuário ${currentUser.id}`);
      
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
        console.error('AuthContext: Erro ao criar perfil:', createError.message);
        throw new Error(`Erro ao criar perfil: ${createError.message}`); // Lança erros de criação
      }

      console.log('AuthContext: Novo perfil criado:', newProfile);
      return newProfile as ProfileWithChurch;

    } catch (error) {
      console.error('AuthContext: Erro em fetchUserProfile:', error);
      // Propaga o erro para cima
      throw error;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      console.log("AuthContext: refreshProfile chamado, mas sem usuário.");
      return;
    }
    console.log("AuthContext: refreshProfile iniciado.");
    setLoading(true);
    setProfile(undefined); // Define como undefined enquanto atualiza
    try {
      const userProfile = await fetchUserProfile(user);
      setProfile(userProfile);
      setChurchId(userProfile?.church_id || null);
      console.log("AuthContext: refreshProfile bem-sucedido. Novo perfil:", userProfile, "churchId:", userProfile?.church_id);
    } catch (error) {
      console.error('AuthContext: refreshProfile falhou:', error);
      setProfile(null); // Define como null se a atualização falhar
      setChurchId(null);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seu perfil. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log("AuthContext: refreshProfile finalizado. Loading:", false);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      console.log("AuthContext: getSessionAndProfile iniciado.");
      setLoading(true);
      setProfile(undefined); // Define como undefined enquanto carrega
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('AuthContext: Erro ao obter sessão:', sessionError.message);
      }

      setSession(session);
      setUser(session?.user ?? null);
      console.log("AuthContext: Sessão inicial definida. Usuário:", session?.user?.id);

      if (session?.user) {
        try {
          const userProfile = await fetchUserProfile(session.user);
          setProfile(userProfile);
          setChurchId(userProfile?.church_id || null);
          console.log("AuthContext: Perfil inicial carregado. Perfil:", userProfile, "churchId:", userProfile?.church_id);
        } catch (error) {
          console.error('AuthContext: Erro ao carregar perfil após sessão:', error);
          setProfile(null); // Define como null se o fetch/criação do perfil falhar
          setChurchId(null);
          toast({
            title: "Erro crítico",
            description: "Não foi possível carregar ou criar seu perfil. Por favor, tente novamente.",
            variant: "destructive",
          });
        }
      } else {
        setProfile(null);
        setChurchId(null);
        console.log("AuthContext: Nenhum usuário na sessão, perfil definido como null.");
      }

      setLoading(false);
      console.log("AuthContext: getSessionAndProfile finalizado. Loading:", false);
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("AuthContext: onAuthStateChange acionado. Evento:", _event, "Usuário da sessão:", session?.user?.id);
        setLoading(true);
        setProfile(undefined); // Define como undefined na mudança de estado de autenticação
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const userProfile = await fetchUserProfile(session.user);
            setProfile(userProfile);
            setChurchId(userProfile?.church_id || null);
            console.log("AuthContext: Perfil carregado após mudança de estado de autenticação. Perfil:", userProfile, "churchId:", userProfile?.church_id);
          } catch (error) {
            console.error('AuthContext: Erro ao carregar perfil após mudança de estado de autenticação:', error);
            setProfile(null); // Define como null se o fetch/criação do perfil falhar
            setChurchId(null);
            toast({
              title: "Erro crítico",
              description: "Não foi possível carregar ou criar seu perfil. Por favor, tente novamente.",
              variant: "destructive",
            });
          }
        } else {
          setProfile(null);
          setChurchId(null);
          console.log("AuthContext: Nenhum usuário após mudança de estado de autenticação, perfil definido como null.");
        }

        setLoading(false);
        console.log("AuthContext: onAuthStateChange finalizado. Loading:", false);
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

  return (
    <AuthContext.Provider value={value}>
      {children}
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