import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Transacoes() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground mt-1">Gerencie todas as transações financeiras</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Módulo de transações em desenvolvimento...</p>
      </div>
    </div>
  );
}
