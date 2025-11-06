import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/LandingPage";
import { LoadingSpinner } from "@/components/LoadingSpinner"; // Importar LoadingSpinner

export function AuthRedirect() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("AuthRedirect: useEffect triggered. Loading:", loading, "User:", !!user, "Profile:", profile, "Church ID:", profile?.church_id);
    if (!loading) {
      if (user) {
        console.log("AuthRedirect: User is authenticated.");
        if (profile === undefined) { 
          console.log("AuthRedirect: Profile is undefined, waiting for profile data.");
          return; // Espera o perfil ser carregado
        }
        
        if (!profile || !profile.church_id) {
          console.log("AuthRedirect: User has no church_id or profile is null, redirecting to /app/create-church");
          navigate("/app/create-church", { replace: true });
        } else {
          console.log("AuthRedirect: User has a church, redirecting to /app/dashboard");
          navigate("/app/dashboard", { replace: true });
        }
      } else {
        console.log("AuthRedirect: User is not authenticated, staying on LandingPage.");
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading || profile === undefined) { // Também espera se o perfil é undefined
    console.log("AuthRedirect: Showing loading spinner (loading:", loading, "profile undefined:", profile === undefined, ").");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  console.log("AuthRedirect: Rendering LandingPage.");
  return <LandingPage />;
}