import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

export default function Relatorios() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Gere e visualize relatórios financeiros</p>
        </div>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Novo Relatório
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <Download className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Módulo de relatórios em desenvolvimento...</p>
      </div>
    </div>
  );
}
