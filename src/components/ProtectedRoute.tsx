import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { logger } from "@/lib/logger";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Timeout de segurança para evitar loading infinito
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        logger.warn('ProtectedRoute: Timeout - forcing redirect to auth');
        setHasTimedOut(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  // Mostrar loading apenas se ainda não deu timeout
  if (loading && !hasTimedOut) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  // Redirecionar se não tem usuário ou deu timeout
  if (!user || hasTimedOut) {
    logger.log('ProtectedRoute: No user or timeout, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
