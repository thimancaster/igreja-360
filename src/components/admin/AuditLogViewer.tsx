import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, Calendar, FileText, Key, Trash2, UserPlus, Edit, Shield } from "lucide-react";
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
  password_reset: "Redefinição de Senha",
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DELETE_TRANSACTIONS: "destructive",
  DELETE_CATEGORIES: "destructive",
  DELETE_MINISTRIES: "destructive",
  DELETE_ALL: "destructive",
  password_reset: "secondary",
  create: "default",
  update: "outline",
  delete: "destructive",
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'password_reset':
      return <Key className="h-3 w-3" />;
    case 'DELETE_TRANSACTIONS':
    case 'DELETE_CATEGORIES':
    case 'DELETE_MINISTRIES':
    case 'DELETE_ALL':
    case 'delete':
      return <Trash2 className="h-3 w-3" />;
    case 'create':
      return <UserPlus className="h-3 w-3" />;
    case 'update':
      return <Edit className="h-3 w-3" />;
    default:
      return <Shield className="h-3 w-3" />;
  }
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
        .limit(100);
      
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!profile?.church_id,
  });

  const formatDetails = (log: AuditLog) => {
    if (!log.details) return "-";
    
    // Password reset details
    if (log.action === 'password_reset' && log.details.target_user_email) {
      return `Usuário: ${log.details.target_user_email}`;
    }
    
    return "-";
  };

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
          <History className="h-5 w-5 text-primary" />
          Log de Auditoria
        </CardTitle>
        <CardDescription>
          Histórico de ações administrativas e eventos de segurança
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
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{log.user_name || "Sistema"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={ACTION_VARIANTS[log.action] || "secondary"}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getActionIcon(log.action)}
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 capitalize">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {log.entity_type}
                        {log.entity_count > 0 ? ` (${log.entity_count})` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {formatDetails(log)}
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
