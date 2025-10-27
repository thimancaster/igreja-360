import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  console.log("ProtectedRoute: Loading:", loading, "User:", !!user);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log("ProtectedRoute: User not authenticated, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  console.log("ProtectedRoute: User authenticated, rendering children.");
  return <>{children}</>;
}