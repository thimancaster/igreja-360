import { Settings as SettingsIcon } from "lucide-react";

export default function Configuracoes() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Configure as preferências do sistema</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Módulo de configurações em desenvolvimento...</p>
      </div>
    </div>
  );
}
