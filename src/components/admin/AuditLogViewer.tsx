import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, Calendar, FileText } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_count: number;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  DELETE_TRANSACTIONS: "Excluir Transações",
  DELETE_CATEGORIES: "Excluir Categorias",
  DELETE_MINISTRIES: "Excluir Ministérios",
  DELETE_ALL: "Limpar Banco de Dados",
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DELETE_TRANSACTIONS: "destructive",
  DELETE_CATEGORIES: "destructive",
  DELETE_MINISTRIES: "destructive",
  DELETE_ALL: "destructive",
};

export function AuditLogViewer() {
  const { profile } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!profile?.church_id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Log de Auditoria
        </CardTitle>
        <CardDescription>
          Histórico de ações destrutivas realizadas no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs && logs.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {log.user_name || "Usuário desconhecido"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANTS[log.action] || "default"}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {log.entity_type}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.entity_count > 0 ? log.entity_count : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma ação registrada ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
