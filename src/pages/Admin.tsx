import { Button } from "@/components/ui/button";
import { Users, Building2, Plus } from "lucide-react";

export default function Admin() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-muted-foreground mt-1">Gerencie usuários, igrejas e ministérios</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Usuários</h3>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-secondary" />
              <h3 className="text-lg font-semibold">Ministérios</h3>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Configure os ministérios da igreja</p>
        </div>
      </div>
    </div>
  );
}
