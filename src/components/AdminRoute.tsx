import React from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdmin, isTesoureiro, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Apenas admin e tesoureiro têm acesso
  if (!isAdmin && !isTesoureiro) {
    toast.error("Você não tem permissão para acessar esta página.");
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
};
