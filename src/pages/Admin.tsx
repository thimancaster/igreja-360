import { Users, Building2, ChevronRight } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Admin() {
  const { isPrivileged, isLoading } = useRole();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isPrivileged) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
    }
  }, [isLoading, isPrivileged, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isPrivileged) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-muted-foreground mt-1">Gerencie usuários, igrejas e ministérios</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link to="/admin/usuarios" className="block hover:shadow-lg transition-shadow rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle>Gerenciar Usuários</CardTitle>
                </div>
                <CardDescription className="mt-2">Visualize e edite os cargos dos usuários.</CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>

        <Link to="/admin/ministerios" className="block hover:shadow-lg transition-shadow rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-secondary" />
                  <CardTitle>Gerenciar Ministérios</CardTitle>
                </div>
                <CardDescription className="mt-2">Adicione e configure os ministérios da igreja.</CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}