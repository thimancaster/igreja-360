// src/contexts/AuthContext.tsx
// --- VERSÃO CORRIGIDA E ROBUSTA ---

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

// Nota: O seu ficheiro AuthContext.tsx mais recente (igreja-360-9203b2dc...)
// usa o tipo `Profile` simples, e não o `ProfileWithChurch`.
// Vamos manter isto para corrigir o build primeiro.
interface Profile extends Tables<'profiles'> {}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // fetchProfile com try/catch para não quebrar o fluxo
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Se o perfil não for encontrado (comum para novos usuários), apenas define como nulo
        console.warn("Perfil não encontrado ou erro RLS:", error.message);
        setProfile(null);
        return null;
      } else {
        setProfile(data as Profile);
        return data as Profile;
      }
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
    // Função para buscar sessão inicial
    const getInitialSession = async () => {
      setLoading(true); // Garante que o loading está ativo
      try {
        const { data: { session: initialSession }, error: getSessionError } = await supabase.auth.getSession();

        if (getSessionError) {
          console.error("Erro ao buscar sessão:", getSessionError.message);
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error("Erro no getInitialSession:", error);
        setProfile(null);
      } finally {
        // **CORREÇÃO 1: Garante que o loading termina, não importa o que aconteça**
        setLoading(false);
      }
    };

    getInitialSession();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setLoading(true); // Inicia o loading
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null); // Limpa o perfil no logout
        }

        setLoading(false); // Termina o loading após a mudança
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);


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
      // A rota correta do App.tsx é /app/dashboard
      const redirectUrl = `${window.location.origin}/app/dashboard`; 

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName, // O seu trigger handle_new_user usará isto
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

      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refetchProfile, setProfile }}>
      {/* **CORREÇÃO 2: Só renderiza a aplicação DEPOIS que o loading inicial terminar** */}
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
