import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/LandingPage";
import { LoadingSpinner } from "@/components/LoadingSpinner"; // Importar LoadingSpinner

export function AuthRedirect() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (profile === undefined) return;
        
        if (!profile || !profile.church_id) {
          navigate("/app/create-church", { replace: true });
        } else {
          navigate("/app/dashboard", { replace: true });
        }
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading || profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return <LandingPage />;
}