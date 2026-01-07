import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileSpreadsheet, CheckCircle, XCircle, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function ImportHistory() {
  const { profile } = useAuth();

  const { data: uploads, isLoading } = useQuery({
    queryKey: ["sheet-uploads", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("sheet_uploads")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Concluído":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case "Erro":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5" />
          <div>
            <CardTitle className="text-base">Histórico de Importações</CardTitle>
            <CardDescription>Últimas 20 importações realizadas</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {uploads && uploads.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Registros</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{upload.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {upload.created_at
                        ? format(new Date(upload.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{upload.records_imported || 0}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(upload.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma importação realizada ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
