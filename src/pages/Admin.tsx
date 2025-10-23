import { Users, Building2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Admin() {
  // As restrições de acesso baseadas em cargo foram removidas.
  // Esta página agora é acessível a qualquer usuário autenticado.

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-muted-foreground mt-1">Gerencie usuários, igrejas e ministérios</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link to="/app/admin/usuarios" className="block hover:shadow-lg transition-shadow rounded-lg">
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

        <Link to="/app/admin/ministerios" className="block hover:shadow-lg transition-shadow rounded-lg">
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