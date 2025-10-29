import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { queryClient } from "@/lib/queryClient";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = useCallback(async (userId: string) => {
    console.log("AuthContext: fetchProfile - Iniciando busca do perfil para user_id:", userId);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("AuthContext: fetchProfile - Erro ao buscar perfil:", error);
      setProfile(null);
      throw error;
    } else {
      console.log("AuthContext: fetchProfile - Perfil encontrado:", data);
      setProfile(data as Profile);
      return data as Profile;
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user?.id) {
      console.log("AuthContext: refetchProfile - Forçando atualização do perfil.");
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    console.log("AuthContext: useEffect - Iniciando monitoramento de estado de autenticação.");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        console.log("AuthContext: onAuthStateChange - Evento:", _event, "Sessão:", currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          try {
            await fetchProfile(currentSession.user.id);
          } catch (error) {
            console.error("AuthContext: onAuthStateChange - Erro ao buscar perfil após mudança de estado:", error);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
        console.log("AuthContext: onAuthStateChange - Finalizado, loading setado para false.");
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log("AuthContext: getSession - Sessão inicial resolvida:", initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        try {
          await fetchProfile(initialSession.user.id);
        } catch (error) {
          console.error("AuthContext: getSession - Erro ao buscar perfil na sessão inicial:", error);
          setProfile(null);
        }
      }
      setLoading(false);
      console.log("AuthContext: getSession - Finalizado, loading setado para false.");
    }).catch(error => {
      console.error("AuthContext: getSession - Erro ao obter sessão:", error);
      setLoading(false);
    });

    return () => {
      console.log("AuthContext: useEffect - Desinscrevendo do monitoramento de estado de autenticação.");
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  useEffect(() => {
    console.log("AuthContext: Profile state updated:", profile);
  }, [profile]);

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
    console.log("AuthContext: signUp - Iniciando cadastro para email:", email, "fullName:", fullName);
    try {
      const redirectUrl = `${window.location.origin}/app/dashboard`;
      
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

      if (error) {
        console.error("AuthContext: signUp - Erro do Supabase ao cadastrar:", error);
        throw error;
      }

      console.log("AuthContext: signUp - Usuário Supabase criado com sucesso:", data.user?.id);
      // Após o signup, o onAuthStateChange deve ser acionado e buscar o perfil.
      // Não precisamos criar o perfil aqui manualmente se houver um trigger.
      // Se não houver trigger, esta é a próxima etapa a ser investigada.

      toast({
        title: "Cadastro realizado!",
        description: "Bem-vindo ao Igreja360. Verifique seu email para confirmar a conta.",
      });
      
    } catch (error: any) {
      console.error("AuthContext: signUp - Erro geral no cadastro:", error);
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
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refetchProfile }}>
      {children}
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