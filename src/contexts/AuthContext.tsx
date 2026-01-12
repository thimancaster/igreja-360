import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | undefined;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      logger.log('AuthContext: Fetching profile for user');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('AuthContext: Error fetching profile:', error.message);
        return undefined;
      }
      
      if (!data) {
        logger.log('AuthContext: No profile found for user');
        return undefined;
      }
      
      logger.log('AuthContext: Profile fetched successfully');
      return data as Profile;
    } catch (err) {
      logger.error('AuthContext: Error in fetchProfile:', err);
      return undefined;
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user?.id) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      logger.log('AuthContext: Initializing...');
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('AuthContext: Error getting session:', error.message);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        logger.log('AuthContext: Session found:', !!currentSession);

        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            const profileData = await fetchProfile(currentSession.user.id);
            if (isMounted) {
              setProfile(profileData);
            }
          }
          
          logger.log('AuthContext: Setting loading to false');
          setLoading(false);
        }
      } catch (err) {
        logger.error('AuthContext: Error initializing auth:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;

        logger.log('AuthContext: Auth state changed:', event);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Usar setTimeout para evitar deadlock
          setTimeout(() => {
            if (isMounted) {
              fetchProfile(newSession.user.id).then(profileData => {
                if (isMounted) {
                  setProfile(profileData);
                }
              });
            }
          }, 0);
        } else {
          setProfile(undefined);
        }

        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    logger.log('AuthContext: Signing in...');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    logger.log('AuthContext: Sign in successful');
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    logger.log('AuthContext: Signing up...');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    logger.log('AuthContext: Sign up successful');
  };

  const signOut = async () => {
    logger.log('AuthContext: Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setUser(null);
    setProfile(undefined);
    logger.log('AuthContext: Sign out successful');
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
