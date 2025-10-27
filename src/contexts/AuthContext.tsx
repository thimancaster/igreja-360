import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

interface Profile extends Tables<'profiles'> {}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = async (userId: string) => {
    console.log("AuthContext: Fetching profile for user:", userId);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("AuthContext: Error fetching profile:", error);
      setProfile(null);
    } else {
      console.log("AuthContext: Profile fetched:", data);
      setProfile(data as Profile);
    }
  };

  useEffect(() => {
    console.log("AuthContext: useEffect triggered");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        console.log("AuthContext: onAuthStateChange event:", _event, "session:", currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          try {
            await fetchProfile(currentSession.user.id);
          } catch (error) {
            console.error("AuthContext: Error in onAuthStateChange fetchProfile:", error);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
        console.log("AuthContext: onAuthStateChange finished, loading set to false.");
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log("AuthContext: getSession resolved, initialSession:", initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        try {
          await fetchProfile(initialSession.user.id);
        } catch (error) {
          console.error("AuthContext: Error in getSession fetchProfile:", error);
          setProfile(null);
        }
      }
      setLoading(false);
      console.log("AuthContext: getSession finished, loading set to false.");
    }).catch(error => {
      console.error("AuthContext: Error in getSession:", error);
      setLoading(false);
    });

    return () => {
      console.log("AuthContext: Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, []);

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
      const redirectUrl = `${window.location.origin}/app/dashboard`;
      
      const { error } = await supabase.auth.signUp({
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
        description: "Bem-vindo ao Igreja360.",
      });
      
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Não foi possível criar sua conta.",
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
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut }}>
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