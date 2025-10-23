import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/LandingPage";

export function AuthRedirect() {
  const { user, profile, loading } = useAuth(); // Get profile from context
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Se o usuário estiver autenticado, verifica se ele tem um church_id
        if (profile && !profile.church_id) {
          navigate("/app/create-church", { replace: true });
        } else {
          navigate("/app/dashboard", { replace: true });
        }
      }
      // Se não estiver autenticado, permanece na LandingPage (que será renderizada abaixo)
    }
  }, [user, profile, loading, navigate]); // Add profile to dependencies

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não estiver autenticado e não estiver carregando, renderiza a LandingPage
  return <LandingPage />;
}