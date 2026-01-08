import { Users, Building2, ChevronRight, Home, Tag, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Admin() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-muted-foreground mt-1">Gerencie usuários, igrejas, ministérios e categorias</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link to="/app/admin/igreja" className="block hover:shadow-lg transition-shadow rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Home className="h-6 w-6 text-primary" />
                  <CardTitle>Gerenciar Igreja</CardTitle>
                </div>
                <CardDescription className="mt-2">Edite os dados da sua igreja.</CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>

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
                  <Building2 className="h-6 w-6 text-primary" />
                  <CardTitle>Gerenciar Ministérios</CardTitle>
                </div>
                <CardDescription className="mt-2">Adicione e configure os ministérios da igreja.</CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>

        <Link to="/app/admin/categorias" className="block hover:shadow-lg transition-shadow rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Tag className="h-6 w-6 text-primary" />
                  <CardTitle>Gerenciar Categorias</CardTitle>
                </div>
                <CardDescription className="mt-2">Organize as categorias de transações.</CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>

        <Link to="/app/admin/dados" className="block hover:shadow-lg transition-shadow rounded-lg">
          <Card className="h-full border-destructive/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-destructive" />
                  <CardTitle>Gerenciar Dados</CardTitle>
                </div>
                <CardDescription className="mt-2">Exclua ou limpe dados do banco de dados.</CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}