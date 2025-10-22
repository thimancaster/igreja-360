import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/LandingPage";

export function AuthRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Se o usuário estiver autenticado, redireciona para o dashboard
        navigate("/app/dashboard", { replace: true });
      }
      // Se não estiver autenticado, permanece na LandingPage (que será renderizada abaixo)
    }
  }, [user, loading, navigate]);

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