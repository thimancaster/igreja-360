import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function GerenciarMinisterios() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6" />
            <div>
              <CardTitle>Gerenciar Ministérios</CardTitle>
              <CardDescription>Adicione, edite e remova os ministérios da sua igreja.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>A funcionalidade de gerenciamento de ministérios será implementada em breve.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}