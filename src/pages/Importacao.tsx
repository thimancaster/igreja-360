import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";

export default function Importacao() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Importação de Planilhas</h1>
        <p className="text-muted-foreground mt-1">Importe dados de Excel, CSV ou Google Sheets</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center hover:border-primary transition-smooth cursor-pointer">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Upload Manual</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Arraste e solte seus arquivos Excel ou CSV aqui
          </p>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Selecionar Arquivo
          </Button>
        </div>

        <div className="rounded-lg border-2 border-border bg-card p-12 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Google Sheets</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sincronize automaticamente com suas planilhas do Google
          </p>
          <Button variant="outline">Conectar Google Sheets</Button>
        </div>
      </div>
    </div>
  );
}
